# -*- coding: utf-8 -*-
"""行内标记解析：把 **加粗** 与 !!红色!! 渲染成真正的 run。

之前各渲染函数只处理"整串被标记包裹"的情况，句中混排会漏掉星号。
本模块提供统一的 inline 渲染，三处渲染函数共用。
"""


def parse_inline(text):
    """把 '普通**加粗**普通!!红色!!' 解析为 [(片段, 是否加粗, 是否红), ...]

    注意：脱敏手机号如 138****0000 会被误判为标记。因此解析时要求
    ** 两侧都是「非数字」边界，或整串被完全包裹时才视为加粗标记。
    显式转义用 \*\*。
    """
    segs = []
    buf = ""
    bold = False
    red = False
    i = 0
    n = len(text)
    while i < n:
        if text.startswith("\\*\\*", i):
            buf += "**"
            i += 4
        elif text.startswith("\\!\\!", i):
            buf += "!!"
            i += 4
        elif text.startswith("!!", i) and not _is_mask(text, i):
            if buf:
                segs.append((buf, bold, red))
                buf = ""
            red = not red
            i += 2
        elif text.startswith("**", i) and not _is_mask(text, i):
            if buf:
                segs.append((buf, bold, red))
                buf = ""
            bold = not bold
            i += 2
        else:
            buf += text[i]
            i += 1
    if buf:
        segs.append((buf, bold, red))
    return segs or [(text, False, False)]


def _is_mask(text, i):
    """判断 text[i:i+2] 是否为脱敏号码的一部分（形如 138****0000）。

    判据：形如「数字 + **** + 数字」时，星号是号码的脱敏占位符而非强调标记。
    做法是向两侧跳过连续星号，看紧邻的字符是否都是数字。
    """
    # 向左跳过所有连续星号
    j = i
    while j > 0 and text[j - 1] == "*":
        j -= 1
    left = text[j - 1] if j > 0 else ""
    # 向右跳过所有连续星号
    k = i
    while k < len(text) and text[k] == "*":
        k += 1
    right = text[k] if k < len(text) else ""
    return left.isdigit() and right.isdigit()


def add_inline(p, text, size=None, bold=False, color=None, cn="宋体", font_name="Times New Roman"):
    """向段落 p 追加带行内格式的多个 run。"""
    from docx.shared import Pt, RGBColor
    RED = RGBColor(0xC0, 0x39, 0x39)
    for seg, b, r in parse_inline(text):
        run = p.add_run(seg)
        run.bold = bold or b
        run.font.size = Pt(size) if size else run.font.size
        run.font.name = font_name
        from docx.oxml.ns import qn
        run._element.rPr.rFonts.set(qn("w:eastAsia"), cn)
        if color is not None:
            run.font.color.rgb = color
        if r:
            run.font.color.rgb = RED
    return p
