using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

namespace VMSCleanSlate;

/// <summary>
/// 런타임에 GDI+로 트레이 아이콘을 생성한다.
/// 어두운 배경에 전기 청록색(electric cyan) V 심볼 — 미래지향적 디자인.
/// </summary>
internal static class IconFactory
{
    // 배경: 딥 네이비  /  테두리: 전기 블루  /  심볼: 사이언
    private static readonly Color BgTop    = Color.FromArgb(255, 10,  18,  40);
    private static readonly Color BgBot    = Color.FromArgb(255, 18,  32,  68);
    private static readonly Color BorderC  = Color.FromArgb(200,  0, 180, 255);
    private static readonly Color GlowC    = Color.FromArgb( 60,  0, 200, 255);
    private static readonly Color SymbolC  = Color.FromArgb(255,  0, 220, 255);
    private static readonly Color SymbolC2 = Color.FromArgb(255, 80, 255, 240);

    public static Icon Create(int size = 32)
    {
        using var bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using var g   = Graphics.FromImage(bmp);

        g.SmoothingMode      = SmoothingMode.AntiAlias;
        g.InterpolationMode  = InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode    = PixelOffsetMode.HighQuality;
        g.TextRenderingHint  = System.Drawing.Text.TextRenderingHint.AntiAlias;
        g.Clear(Color.Transparent);

        float s   = size;
        float r   = s * 0.13f;   // corner radius
        var   rect = new RectangleF(0.5f, 0.5f, s - 1f, s - 1f);

        // ── 1. 배경 그라디언트
        using (var bg = new LinearGradientBrush(
            new PointF(0, 0), new PointF(s, s), BgTop, BgBot))
        {
            using var path = RoundRect(rect, r);
            g.FillPath(bg, path);
        }

        // ── 2. 발광 외곽선 (두껍게 그려 글로우 느낌)
        using (var glowPen = new Pen(GlowC, s * 0.10f))
        {
            glowPen.LineJoin = LineJoin.Round;
            using var path = RoundRect(
                new RectangleF(rect.X + s * 0.02f, rect.Y + s * 0.02f,
                               rect.Width - s * 0.04f, rect.Height - s * 0.04f), r);
            g.DrawPath(glowPen, path);
        }
        using (var borderPen = new Pen(BorderC, s * 0.035f))
        {
            borderPen.LineJoin = LineJoin.Round;
            using var path = RoundRect(rect, r);
            g.DrawPath(borderPen, path);
        }

        // ── 3. V 심볼 (굵은 꺾임선, 위쪽 안쪽에서 아래 중앙, 다시 위 오른쪽으로)
        DrawV(g, s, SymbolC, SymbolC2);

        // ── 4. 상단 가로 강조선 (하이라이트 느낌)
        using (var hiPen = new Pen(Color.FromArgb(80, 255, 255, 255), s * 0.025f))
        {
            g.DrawLine(hiPen,
                new PointF(s * 0.22f, s * 0.08f),
                new PointF(s * 0.78f, s * 0.08f));
        }

        return BitmapToIcon(bmp, size);
    }

    private static void DrawV(Graphics g, float s, Color top, Color bot)
    {
        // V의 세 꼭짓점
        float lx = s * 0.18f, ly = s * 0.25f;  // 왼쪽 상단
        float rx = s * 0.82f, ry = s * 0.25f;  // 오른쪽 상단
        float cx = s * 0.50f, cy = s * 0.78f;  // 아래 중앙 꼭짓점

        using var path = new GraphicsPath();
        // 왼획: 위→아래중앙
        path.AddLine(new PointF(lx, ly), new PointF(cx, cy));
        // 오른획: 아래중앙→위
        path.AddLine(new PointF(cx, cy), new PointF(rx, ry));

        // 글로우 (뒤)
        using (var glowPen = new Pen(Color.FromArgb(90, 0, 200, 255), s * 0.20f))
        {
            glowPen.StartCap = LineCap.Round;
            glowPen.EndCap   = LineCap.Round;
            glowPen.LineJoin = LineJoin.Round;
            g.DrawPath(glowPen, path);
        }

        // 그라디언트 펜 시뮬레이션: 진한 선 먼저, 밝은 선 위에
        using (var pen1 = new Pen(Color.FromArgb(160, 0, 160, 220), s * 0.115f))
        {
            pen1.StartCap = LineCap.Round;
            pen1.EndCap   = LineCap.Round;
            pen1.LineJoin = LineJoin.Round;
            g.DrawPath(pen1, path);
        }
        using (var pen2 = new Pen(top, s * 0.065f))
        {
            pen2.StartCap = LineCap.Round;
            pen2.EndCap   = LineCap.Round;
            pen2.LineJoin = LineJoin.Round;
            g.DrawPath(pen2, path);
        }
        // 중심 하이라이트 (얇은 밝은 흰빛)
        using (var penHi = new Pen(Color.FromArgb(200, 200, 255, 255), s * 0.022f))
        {
            penHi.StartCap = LineCap.Round;
            penHi.EndCap   = LineCap.Round;
            penHi.LineJoin = LineJoin.Round;
            g.DrawPath(penHi, path);
        }
    }

    private static GraphicsPath RoundRect(RectangleF rect, float r)
    {
        var p = new GraphicsPath();
        p.AddArc(rect.X,                      rect.Y,                       r * 2, r * 2, 180, 90);
        p.AddArc(rect.Right - r * 2,          rect.Y,                       r * 2, r * 2, 270, 90);
        p.AddArc(rect.Right - r * 2,          rect.Bottom - r * 2,          r * 2, r * 2,   0, 90);
        p.AddArc(rect.X,                      rect.Bottom - r * 2,          r * 2, r * 2,  90, 90);
        p.CloseFigure();
        return p;
    }

    private static Icon BitmapToIcon(Bitmap bmp, int size)
    {
        // 16×16 아이콘도 함께 포함한 ICO 데이터를 메모리에 직접 작성
        using var ms = new System.IO.MemoryStream();

        // 포함할 크기 결정
        int[] sizes = size >= 32 ? new[] { 32, 16 } : new[] { size };

        WriteIco(ms, bmp, sizes);
        ms.Position = 0;
        return new Icon(ms);
    }

    private static void WriteIco(System.IO.MemoryStream ms, Bitmap src, int[] sizes)
    {
        // ICO 파일 포맷: ICONDIR + ICONDIRENTRY[] + PNG/BMP data
        var pngs = new byte[sizes.Length][];
        for (int i = 0; i < sizes.Length; i++)
        {
            using var thumb = new Bitmap(sizes[i], sizes[i], PixelFormat.Format32bppArgb);
            using (var g2 = Graphics.FromImage(thumb))
            {
                g2.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g2.DrawImage(src, 0, 0, sizes[i], sizes[i]);
            }
            using var pngMs = new System.IO.MemoryStream();
            thumb.Save(pngMs, ImageFormat.Png);
            pngs[i] = pngMs.ToArray();
        }

        var w = new System.IO.BinaryWriter(ms);

        // ICONDIR
        w.Write((short)0);           // reserved
        w.Write((short)1);           // type = ICO
        w.Write((short)sizes.Length);

        int dataOffset = 6 + sizes.Length * 16;
        for (int i = 0; i < sizes.Length; i++)
        {
            int sz = sizes[i];
            w.Write((byte)(sz >= 256 ? 0 : sz));   // width (0=256)
            w.Write((byte)(sz >= 256 ? 0 : sz));   // height
            w.Write((byte)0);                       // color count
            w.Write((byte)0);                       // reserved
            w.Write((short)1);                      // planes
            w.Write((short)32);                     // bit count
            w.Write(pngs[i].Length);                // size
            w.Write(dataOffset);                    // offset
            dataOffset += pngs[i].Length;
        }
        foreach (var png in pngs)
            w.Write(png);

        w.Flush();
    }
}
