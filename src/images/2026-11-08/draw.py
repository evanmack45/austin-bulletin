from pathlib import Path
import random, hashlib, json
import cairosvg
from PIL import Image
D=Path(__file__).parent
random.seed(1126)
# All pictorial geometry below is original; there are no imported pictorial assets.
texture=''.join(f'<path d="M {random.randrange(430,1110)} {random.randrange(240,870)} l {random.randrange(2,9)} -1"/>' for _ in range(240))
art=f'''<defs>
<clipPath id="sheet"><path d="M410 230H1040L1140 330V860H410Z"/></clipPath>
<pattern id="grain" width="29" height="31" patternUnits="userSpaceOnUse"><circle cx="5" cy="8" r="0.7" fill="#142e39" opacity=".10"/><path d="M20 23l3 -1" stroke="#142e39" stroke-width=".6" opacity=".08"/></pattern>
</defs>
<!-- Ink field and off-centre warm work surface. -->
<path fill="#173541" d="M0 0H1600V1000H0Z"/>
<path fill="#e8d8b8" d="M0 0H1600V630L0 1000Z"/>
<path fill="#bd4033" d="M0 0H365L0 668Z"/>
<path fill="#d0bd9b" d="M1260 0H1600V375Z"/>
<!-- Empty, unnumbered calendar leaves: a future not yet filled in. -->
<g transform="translate(1120 58) rotate(13)">
<path d="M-26 36H300V338L-26 365Z" fill="#193640" opacity=".18"/>
<path d="M0 15H295V327L0 345Z" fill="#c4b898"/>
<path d="M-15 0H281V311L-15 329Z" fill="#ded3b7"/>
<path d="M-28 -13H267V295L-28 312Z" fill="#f5edda"/>
<path d="M-28 36H267" stroke="#d8cbb0" stroke-width="3"/>
<path d="M26 -25V14M91 -25V14M156 -25V14M221 -25V14" stroke="#173541" stroke-width="10" stroke-linecap="round"/>
<path d="M207 299L267 241V295Z" fill="#b9aa8d"/>
<path d="M207 299L267 241L205 244Z" fill="#fff8e8"/>
</g>
<!-- A folded blank sheet, deliberately not a registration form. -->
<g transform="rotate(-9 775 545)">
<path d="M433 264H1063L1163 364V894H433Z" fill="#0d2631" opacity=".27"/>
<path d="M410 230H1040L1140 330V860H410Z" fill="#fff8e7"/>
<g clip-path="url(#sheet)" stroke="#bda986" stroke-width="1" opacity=".32">{texture}</g>
<path d="M1040 230L1040 330H1140Z" fill="#d8c7a5"/>
<path d="M1040 230L1026 343L1140 330" fill="#f0e5cc"/>
<path d="M410 831H1140V860H410Z" fill="#eadbbd"/>
<path d="M445 860L1114 860" stroke="#c9b48e" stroke-width="2"/>
</g>
<!-- Strong tactile pencil, sharpened point resting on the blank paper. -->
<g transform="translate(420 775) rotate(-32)">
<path d="M-6 25L108 77H1041Q1070 77 1070 48V25Z" fill="#0a2632" opacity=".22"/>
<path d="M0 0L118 -48H944V48H118Z" fill="#c34535"/>
<path d="M118 -48H944V-13H118Z" fill="#e56a4b"/>
<path d="M118 15H944V48H118Z" fill="#922e2d"/>
<path d="M118 -13H944V15H118Z" fill="#bd4033"/>
<path d="M0 0L118 -48L98 -14L118 15L118 48Z" fill="#ddb783"/>
<path d="M0 0L98 -14L118 15L118 48Z" fill="#c99665"/>
<path d="M0 0L37 -15L32 13Z" fill="#142e39"/>
<path d="M944 -48H1004V48H944Z" fill="#c9c4af"/>
<path d="M944 -48H1004V-16H944Z" fill="#f1e9d5"/>
<path d="M951 -48V48M965 -48V48M991 -48V48" stroke="#8d9a95" stroke-width="3"/>
<path d="M1004 -48H1045Q1081 -48 1081 -12V12Q1081 48 1045 48H1004Z" fill="#e1a48d"/>
<path d="M1011 -38H1042Q1071 -38 1071 -12" fill="none" stroke="#f3c5a8" stroke-width="8"/>
<path d="M1004 22H1079Q1075 48 1045 48H1004Z" fill="#b97565"/>
<path d="M151 -36H913" stroke="#f58e61" stroke-width="3" opacity=".7"/>
</g>
<path fill="url(#grain)" d="M0 0H1600V1000H0Z"/>
'''
for name,w,h,vb in [('desktop-1600',1600,1000,'0 0 1600 1000'),('phone-780',780,560,'110 0 1392.857143 1000')]:
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{vb}" role="img" aria-labelledby="title desc"><title id="title">Preparing for a possible runoff</title><desc id="desc">Symbolic editorial illustration: a red pencil rests diagonally across a folded blank sheet, with pale unmarked calendar leaves behind it. Not an official form or a photograph.</desc>{art}</svg>'''
 p=D/f'runoff-lead-{name}.svg';p.write_text(svg)
 cairosvg.svg2png(bytestring=svg.encode(),write_to=str(p.with_suffix('.png')),output_width=w,output_height=h)
 Image.open(p.with_suffix('.png')).convert('RGB').save(p.with_suffix('.webp'),format='WEBP',lossless=True,method=6)
print('Rendered both original vector compositions.')
