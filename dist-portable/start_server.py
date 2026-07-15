# -*- coding: utf-8 -*-
import http.server
import socketserver
import webbrowser
import os
import sys
import threading
import time

PORT = 5202
HOST = "127.0.0.1"

def start_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = http.server.SimpleHTTPRequestHandler
    Handler.extensions_map.update({
        '.wasm': 'application/wasm',
        '.json': 'application/json',
        '.md': 'text/markdown',
    })
    
    try:
        with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
            print(f"服务器已启动: http://{HOST}:{PORT}")
            print("按 Ctrl+C 停止服务器")
            httpd.serve_forever()
    except OSError as e:
        print(f"端口 {PORT} 被占用，尝试其他端口...")
        global PORT
        PORT = 5203
        with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
            print(f"服务器已启动: http://{HOST}:{PORT}")
            httpd.serve_forever()

def open_browser():
    time.sleep(1)
    url = f"http://{HOST}:{PORT}"
    webbrowser.open(url)

if __name__ == "__main__":
    print("=" * 50)
    print("          园丁工作台 - 便携版")
    print("=" * 50)
    print()
    print("说明：")
    print("- 本程序启动本地HTTP服务器提供服务")
    print("- 所有数据保存在浏览器本地存储中")
    print("- AI对话功能需要联网并配置API Key")
    print("- 关闭窗口即可停止服务")
    print()
    
    server_thread = threading.Thread(target=start_server)
    server_thread.daemon = True
    server_thread.start()
    
    open_browser()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n服务器已停止")
        sys.exit(0)