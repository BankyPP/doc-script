import pdfminer.converter as cv
SARABUN={734:'ั',736:'่',737:'่',739:'้',740:'้',750:'็',753:'ิ',755:'ี',759:'ื',761:'่ํ',762:'้ํ',771:'่'}
KANIT={720:'ั',722:'่',725:'้',739:'ิ'}
_orig=cv.PDFLayoutAnalyzer.render_char
def render_char(self, matrix, font, fontsize, scaling, rise, cid, ncs, graphicstate):
    adv=_orig(self, matrix, font, fontsize, scaling, rise, cid, ncs, graphicstate)
    try:
        it=self.cur_item._objs[-1]
        if it.get_text()=='\x00':
            fn=it.fontname
            m=(KANIT if 'Kanit' in fn else SARABUN if 'Sarabun' in fn else {}).get(cid)
            it._text=m if m else ''
    except Exception: pass
    return adv
cv.PDFLayoutAnalyzer.render_char=render_char
