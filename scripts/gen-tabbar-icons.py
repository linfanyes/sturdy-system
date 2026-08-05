"""Generate WeChat tabBar icons (81x81 PNG) for gardener mini-program.
5 icons x 2 states: normal (#9aa0a6) / active (#f5b342 butter).
"""
import math
import os
from PIL import Image, ImageDraw

SIZE = 81
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mini-program', 'src', 'static', 'tabbar')
GRAY = (154, 160, 166, 255)     # #9aa0a6 tabBar color
BUTTER = (245, 179, 66, 255)    # #f5b342 primary


def new_canvas():
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def draw_dashboard(d, c):
    """工作台：房子（屋顶 + 房体 + 门）"""
    # 屋顶
    d.polygon([(40, 16), (14, 40), (66, 40)], outline=c, width=5)
    # 房体
    d.rectangle([18, 40, 62, 64], outline=c, width=5)
    # 门
    d.rectangle([34, 48, 46, 64], outline=c, width=4)


def draw_classes(d, c):
    """班级：学校（房子 + 旗杆 + 旗）"""
    # 旗杆
    d.line([(50, 14), (50, 40)], fill=c, width=4)
    # 旗
    d.polygon([(50, 14), (64, 20), (50, 26)], fill=c)
    # 屋顶
    d.polygon([(40, 24), (14, 44), (66, 44)], outline=c, width=5)
    # 房体
    d.rectangle([18, 44, 62, 66], outline=c, width=5)


def draw_students(d, c):
    """学生：学士帽（帽顶 + 帽檐 + 流苏）"""
    # 帽檐
    d.line([(16, 46), (64, 46)], fill=c, width=5)
    # 帽顶菱形
    d.polygon([(40, 20), (14, 38), (40, 52), (66, 38)], outline=c, width=5)
    # 流苏
    d.line([(56, 42), (60, 58)], fill=c, width=4)
    d.ellipse([57, 56, 63, 62], outline=c, width=3)


def draw_toolbox(d, c):
    """工具箱：箱体 + 提手"""
    # 提手
    d.arc([30, 16, 50, 36], 180, 360, fill=c, width=5)
    # 箱体
    d.rectangle([16, 32, 64, 64], outline=c, width=5)
    # 锁扣
    d.line([(40, 40), (40, 48)], fill=c, width=4)


def draw_config(d, c):
    """设置：齿轮（外齿 + 内圆 + 轴）"""
    cx, cy, R = 40, 40, 18
    r_in = 11
    teeth = 8
    pts = []
    for i in range(teeth * 2):
        ang = math.pi * i / teeth
        rad = R if i % 2 == 0 else R - 6
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    d.polygon(pts, outline=c, width=4)
    d.ellipse([cx - r_in, cy - r_in, cx + r_in, cy + r_in], outline=c, width=4)
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=c)


DRAWERS = {
    'dashboard': draw_dashboard,
    'classes': draw_classes,
    'students': draw_students,
    'toolbox': draw_toolbox,
    'config': draw_config,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in DRAWERS.items():
        for suffix, color in (('', GRAY), ('-active', BUTTER)):
            img, d = new_canvas()
            fn(d, color)
            path = os.path.join(OUT, f'{name}{suffix}.png')
            img.save(path)
            print('wrote', path)


if __name__ == '__main__':
    main()
