"""카톡/SNS 공유용 오픈그래프 썸네일(1200x630) 생성.

사이트와 같은 톤(흰 배경 + 레드 #FC1C49)으로 만든다.
실행: python make_og.py  ->  og.png
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
RED = (252, 28, 73)
INK = (13, 13, 18)
SUB = (91, 100, 114)
SOFT = (246, 247, 249)
LINE = (234, 236, 240)
GREEN = (18, 184, 134)

BD = "C:/Windows/Fonts/malgunbd.ttf"
RG = "C:/Windows/Fonts/malgun.ttf"

f_brand = ImageFont.truetype(BD, 34)
f_tag = ImageFont.truetype(RG, 22)
f_h1 = ImageFont.truetype(BD, 68)
f_lead = ImageFont.truetype(RG, 28)
f_chip = ImageFont.truetype(BD, 24)
f_price = ImageFont.truetype(BD, 30)
f_small = ImageFont.truetype(RG, 22)

img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)

# 우상단 은은한 레드 글로우
glow = Image.new("RGB", (W, H), "white")
gd = ImageDraw.Draw(glow)
for i in range(28):
    r = 520 - i * 16
    t = i / 28
    col = (255, int(240 + 15 * t), int(243 + 12 * t))
    gd.ellipse([W - 300 - r, -260 - r, W - 300 + r, -260 + r], fill=col)
img = Image.blend(glow, img, 0.35)
d = ImageDraw.Draw(img)

# 상단 레드 바
d.rectangle([0, 0, W, 10], fill=RED)

# 브랜드 (로고마크 + 이름)
d.rounded_rectangle([70, 60, 128, 118], radius=16, fill=RED)
d.text((99, 89), "C", font=ImageFont.truetype(BD, 38), fill="white", anchor="mm")
d.text((146, 72), "Cadence", font=f_brand, fill=INK)
d.text((148, 112), "업무 자동화 · AI 워크플로우 스튜디오", font=f_tag, fill=SUB)

# 메인 카피
d.text((70, 196), "반복 업무, 이제", font=f_h1, fill=INK)
d.text((70, 276), "코드와 AI", font=f_h1, fill=RED)
w_ = d.textlength("코드와 AI", font=f_h1)
d.text((70 + w_ + 8, 276), "에게 맡기세요", font=f_h1, fill=INK)

d.text((70, 372), "엑셀 정리 · 데이터 수집 · 리포트 · 알림까지 자동으로", font=f_lead, fill=SUB)

# 서비스 가격 칩 3개
chips = [("데이터 수집", "9만원~"), ("엑셀 자동화", "5만원~"), ("알림·리포트", "7만원~")]
x = 70
for name, price in chips:
    tw = max(d.textlength(name, font=f_chip), d.textlength(price, font=f_price)) + 56
    d.rounded_rectangle([x, 434, x + tw, 528], radius=16, fill=SOFT, outline=LINE, width=2)
    d.text((x + tw / 2, 462), name, font=f_chip, fill=SUB, anchor="mm")
    d.text((x + tw / 2, 502), price, font=f_price, fill=RED, anchor="mm")
    x += tw + 18

# 하단 배지
d.rounded_rectangle([70, 556, 470, 600], radius=22, fill=(232, 250, 244))
d.ellipse([88, 570, 104, 586], fill=GREEN)
d.text((116, 578), "진단 · 견적 무료 · 착수금 없음", font=f_small, fill=(11, 122, 90), anchor="lm")

# 우측 하단 URL
d.text((W - 70, 578), "richroro.github.io", font=f_small, fill=SUB, anchor="rm")

img.save("og.png", "PNG", optimize=True)
print("saved og.png", img.size)
