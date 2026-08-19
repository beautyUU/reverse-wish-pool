from flask import Flask, request, jsonify, render_template
import qrcode
from io import BytesIO
import base64
import os
import csv
import json
import time
from datetime import datetime
import requests

app = Flask(__name__)

# DeepSeek API配置
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

SYSTEM_PROMPT = """你是「反向许愿池」。用户会输入一个TA特别想要的愿望。你不会帮TA实现愿望，而是用三位经典角色的口吻，分别说出一句"如果愿望成真，代价是什么"。不是劝退，是让用户笑着清醒。

🔫 李云龙 · 亮剑
- 气质：糙汉硬核，不绕弯子。说话像拍桌子，句句在理。
- 风格：用打仗、行军、兄弟作比。语气冲，但内核是"为你好"。
- 口头禅方向：他娘的、你小子、老子
- 禁令：禁止长篇大论。禁止掉书袋。

💰 佟湘玉 · 同福客栈
- 气质：抠门老板娘，算盘打得精。
- 风格：用算账、银子、客栈作比。碎碎念但精准。
- 口头禅方向：额滴神啊、四不四撒、划不划算
- 禁令：禁止煽情。必须落在"划不划算"上。

👑 甄嬛 · 深宫
- 气质：深宫清醒者，见过太多起落。
- 风格：用月色、炉火、茶凉作比。话软刀快。
- 口头禅方向：姐姐、倒显得、罢了
- 禁令：禁止堆砌"本宫""皇上""臣妾"。禁止煽情。

输出格式（严格执行，总字数不超过150字）：
🔫 李云龙：（一句话，不超过25字）
💰 佟湘玉：（一句话，不超过25字）
👑 甄嬛：（一句话，不超过25字）

全局禁令：
1. 禁止输出"我认为""或许"等评价词。
2. 禁止重复用户输入中的原词。
3. 禁止超过字数。
4. 只看用户最新一条消息。"""

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/wish', methods=['POST'])
def wish():
    data = request.get_json()
    user_wish = data.get('wish', '').strip()
    
    if not user_wish:
        return jsonify({'error': '愿望不能为空'}), 400
    
    # 调用DeepSeek API
    try:
        response = requests.post(
            DEEPSEEK_API_URL,
            headers={
                'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'deepseek-chat',
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': user_wish}
                ],
                'max_tokens': 200,
                'temperature': 0.8
            },
            timeout=30
        )
        
        if response.status_code != 200:
            return jsonify({'error': f'API调用失败: {response.status_code}'}), 500
        
        result = response.json()
        reply_content = result['choices'][0]['message']['content']
        
        # 解析三句回复
        lines = reply_content.strip().split('\n')
        replies = {
            'liyunlong': '',
            'tongxiangyu': '',
            'zhenhuan': ''
        }
        
        for line in lines:
            line_clean = line.strip()
            if '李云龙' in line_clean:
                # 去掉前缀
                parts = line_clean.split('：')
                if len(parts) > 1:
                    replies['liyunlong'] = parts[1].strip()
                else:
                    replies['liyunlong'] = line_clean.replace('🔫 李云龙', '').replace('**', '').strip()
            elif '佟湘玉' in line_clean:
                parts = line_clean.split('：')
                if len(parts) > 1:
                    replies['tongxiangyu'] = parts[1].strip()
                else:
                    replies['tongxiangyu'] = line_clean.replace('💰 佟湘玉', '').replace('**', '').strip()
            elif '甄嬛' in line_clean:
                parts = line_clean.split('：')
                if len(parts) > 1:
                    replies['zhenhuan'] = parts[1].strip()
                else:
                    replies['zhenhuan'] = line_clean.replace('👑 甄嬛', '').replace('**', '').strip()
        
        # 如果解析失败，用原始文本
        if not any(replies.values()):
            replies['liyunlong'] = reply_content[:50] + '...'
        
        # 记录日志
        log_to_csv(user_wish, replies)
        
        return jsonify({'replies': replies})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def log_to_csv(wish, replies):
    """记录日志到CSV"""
    log_file = 'logs.csv'
    file_exists = os.path.isfile(log_file)
    
    with open(log_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(['时间', '愿望', '李云龙', '佟湘玉', '甄嬛'])
        writer.writerow([
            datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            wish,
            replies.get('liyunlong', ''),
            replies.get('tongxiangyu', ''),
            replies.get('zhenhuan', '')
        ])

@app.route('/api/qrcode')
def generate_qrcode():
    # 你的页面地址（换成你自己的域名或IP）
    url = 'http://127.0.0.1:5000'
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=4,
        border=1,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="#c9a86c", back_color="#0a0a0d")
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return jsonify({'qrcode': f'data:image/png;base64,{img_base64}'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 7860))
    app.run(debug=True, host='0.0.0.0', port=port)