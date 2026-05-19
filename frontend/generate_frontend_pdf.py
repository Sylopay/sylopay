import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        orange = colors.HexColor('#D97706') # Orange-600
        zinc = colors.HexColor('#71717A') # Zinc-500
        
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(orange)
            self.drawString(54, 750, "SyloPay Frontend — React & Tailwind UI")
            self.setFont("Helvetica", 8)
            self.setFillColor(zinc)
            self.drawRightString(612 - 54, 750, "Technical & Design Documentation")
            
            self.setStrokeColor(colors.HexColor('#E4E4E7')) # Zinc-200
            self.setLineWidth(0.5)
            self.line(54, 742, 612 - 54, 742)
            
        self.setStrokeColor(colors.HexColor('#E4E4E7'))
        self.setLineWidth(0.5)
        self.line(54, 55, 612 - 54, 55)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(zinc)
        self.drawString(54, 42, "Confidential — UI Component & Design System Specifications")
        self.drawRightString(612 - 54, 42, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf():
    pdf_path = "/home/josias/Projetos/sylopay/frontend/frontend_docs.pdf"
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )

    styles = getSampleStyleSheet()
    
    PRIMARY_COLOR = colors.HexColor('#D97706') # Orange-600
    TEXT_COLOR = colors.HexColor('#18181B') # Zinc-900
    BODY_COLOR = colors.HexColor('#27272A') # Zinc-800
    SECONDARY_COLOR = colors.HexColor('#71717A') # Zinc-500
    
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=PRIMARY_COLOR,
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=12,
        leading=16,
        textColor=SECONDARY_COLOR,
        spaceAfter=30
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=PRIMARY_COLOR,
        spaceBefore=18,
        spaceAfter=8,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=PRIMARY_COLOR,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14.5,
        textColor=BODY_COLOR,
        spaceAfter=6
    )
    
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=BODY_COLOR,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )
    
    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#0F172A'), # Slate-900
    )

    story = []

    story.append(Paragraph("SyloPay Frontend UI Documentation", title_style))
    story.append(Paragraph("React Single Page Application Components & Docusaurus Guide", subtitle_style))
    story.append(Spacer(1, 15))

    story.append(Paragraph("1. Architecture & Core Pages", h1_style))
    story.append(Paragraph("The SyloPay frontend is built as a Single Page Application (SPA) using React, Vite, TypeScript, and TailwindCSS. It implements a smooth, multi-step Buy Now, Pay Later checkout pipeline:", body_style))
    story.append(Spacer(1, 5))

    th_style = ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, textColor=colors.white)
    td_style = ParagraphStyle('TD', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, textColor=BODY_COLOR)
    
    pages_data = [
        [Paragraph("<b>Route</b>", th_style), Paragraph("<b>Page Name</b>", th_style), Paragraph("<b>Operational Purpose</b>", th_style)],
        [Paragraph("/", td_style), Paragraph("CheckoutPage", td_style), Paragraph("Product catalogs displaying premium items (e.g., Samsung Galaxy S25 Ultra) and checkout initiation.", td_style)],
        [Paragraph("/quotation", td_style), Paragraph("QuotationPage", td_style), Paragraph("Visual selection of credit terms, number of installments (1-12), and DeFi APR comparison.", td_style)],
        [Paragraph("/contract", td_style), Paragraph("ContractPage", td_style), Paragraph("Personal customer information capture (Pix/PIX rampa) and Freighter Wallet signature.", td_style)],
        [Paragraph("/processing", td_style), Paragraph("ProcessingPage", td_style), Paragraph("On-chain registration feedback loop, Pix sandboxed QR Code generation, and webhook listening.", td_style)],
        [Paragraph("/dashboard", td_style), Paragraph("DashboardPage", td_style), Paragraph("Customer's portal to track and settle upcoming installments directly using USDC on-chain.", td_style)],
    ]
    
    pg_table = Table(pages_data, colWidths=[80, 110, 314])
    pg_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E4E4E7')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#FAFAFA')]),
    ]))
    
    story.append(pg_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("2. Global State Management (useBNPL)", h1_style))
    story.append(Paragraph("A robust React Context hook (useBNPL) serves as the single source of truth, synchronizing checkout steps, product selections, user details, quote calculations, and Soroban contract states:", body_style))
    
    code_context = """interface BNPLContextType {
  currentStep: 'checkout' | 'quotation' | 'contract' | 'processing' | 'dashboard';
  product: Product | null;
  selectedPlan: InstallmentPlan | null;
  personalInfo: PersonalInfo | null;
  contractId: string | null;
  walletAddress: string | null;
  setProduct: (p: Product) => void;
  selectPlan: (plan: InstallmentPlan) => void;
  savePersonalInfo: (info: PersonalInfo) => void;
  setContractId: (id: string) => void;
  setWalletAddress: (address: string) => void;
  resetCheckout: () => void;
}"""
    t_ctx = Table([[Paragraph(code_context.replace("\n", "<br/>").replace("    ", "&nbsp;&nbsp;&nbsp;&nbsp;"), code_style)]], colWidths=[504])
    t_ctx.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F4F4F5')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E4E4E7')),
    ]))
    story.append(t_ctx)

    story.append(Paragraph("3. Core Component Library", h1_style))
    story.append(Paragraph("• <b>Button</b> — Robust button wrapping custom variations (primary, secondary, outline, ghost) and loading loaders.", bullet_style))
    story.append(Paragraph("• <b>ProgressBar</b> — Glowing orange checkout indicator tracking step checkout -> quotation -> contract -> processing -> dashboard.", bullet_style))
    story.append(Paragraph("• <b>Logo</b> — Displays official SyloPay typography and branding image.", bullet_style))
    story.append(Paragraph("• <b>WalletConnector</b> — Freighter wallet connector and details display.", bullet_style))
    story.append(Paragraph("• <b>PricingCalculator</b> — Compares BNPL checkout APR with credit card fees.", bullet_style))
    story.append(Paragraph("• <b>PixPayment</b> — Generates sandbox Pix copy-paste key and payment verification hooks.", bullet_style))

    story.append(Paragraph("4. UI Design System & Brand Aesthetics", h1_style))
    story.append(Paragraph("SyloPay enforces a premium, dark-mode visual theme characterized by high-end typography and sleek shadows:", body_style))
    story.append(Paragraph("• <b>Primary Accent</b>: Glowing Amber Orange (#D97706) representing blockchain energy.", bullet_style))
    story.append(Paragraph("• <b>Dark Slate</b>: Off-black gradients (#0A0A0A, #121212) to create glassmorphism panels.", bullet_style))
    story.append(Paragraph("• <b>Text Hierarchy</b>: Off-white high contrast (#F4F4F5) and low contrast muted elements (#71717A).", bullet_style))

    story.append(Paragraph("5. Docusaurus Documentation Portal", h1_style))
    story.append(Paragraph("We have successfully integrated Docusaurus as our core developer specification documentation portal! Docusaurus provides a searchable, fast, and modern documentation website complete with interactive diagrams and clean UI.", body_style))
    story.append(Spacer(1, 5))
    
    story.append(Paragraph("To run the searchable Docusaurus documentation website locally:", body_style))
    code_sb = "cd docs\nnpm start"
    t_sb = Table([[Paragraph(code_sb.replace("\n", "<br/>"), code_style)]], colWidths=[504])
    t_sb.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F4F4F5')),
        ('PADDING', (0,0), (-1,-1), 8),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#E4E4E7')),
    ]))
    story.append(t_sb)

    doc.build(story, canvasmaker=NumberedCanvas)
    print("Frontend PDF successfully generated!")

if __name__ == '__main__':
    build_pdf()
