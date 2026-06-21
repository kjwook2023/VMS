using System.Drawing;

namespace VMSCleanSlate;

public sealed class ReminderPopupForm : Form
{
    private readonly System.Windows.Forms.Timer _closeTimer;

    public ReminderPopupForm(string title, string message, int autoCloseMs = 4000)
    {
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        TopMost = true;
        BackColor = Color.FromArgb(32, 37, 46);
        ForeColor = Color.White;
        Font = new Font("Segoe UI", 9.5f);
        ClientSize = new Size(280, 92);

        var accent = new Panel
        {
            BackColor = Color.FromArgb(0, 120, 215),
            Location = new Point(0, 0),
            Size = new Size(4, ClientSize.Height)
        };
        Controls.Add(accent);

        var titleLabel = new Label
        {
            Text = title,
            AutoSize = false,
            Location = new Point(14, 12),
            Size = new Size(220, 22),
            Font = new Font("Segoe UI", 10f, FontStyle.Bold),
            ForeColor = Color.White
        };
        Controls.Add(titleLabel);

        var messageLabel = new Label
        {
            Text = message,
            AutoSize = false,
            Location = new Point(14, 38),
            Size = new Size(252, 38),
            ForeColor = Color.FromArgb(232, 236, 240)
        };
        Controls.Add(messageLabel);

        var closeLabel = new Label
        {
            Text = "x",
            TextAlign = ContentAlignment.MiddleCenter,
            Location = new Point(244, 10),
            Size = new Size(22, 22),
            Cursor = Cursors.Hand,
            ForeColor = Color.FromArgb(200, 205, 210)
        };
        closeLabel.Click += (_, _) => Close();
        Controls.Add(closeLabel);

        _closeTimer = new System.Windows.Forms.Timer { Interval = Math.Max(1000, autoCloseMs) };
        _closeTimer.Tick += (_, _) => Close();

        Shown += (_, _) =>
        {
            PositionNearBottomRight();
            _closeTimer.Start();
        };

        FormClosed += (_, _) => _closeTimer.Dispose();
        Click += (_, _) => Close();
        titleLabel.Click += (_, _) => Close();
        messageLabel.Click += (_, _) => Close();
        accent.Click += (_, _) => Close();
    }

    protected override bool ShowWithoutActivation => true;

    protected override CreateParams CreateParams
    {
        get
        {
            const int WS_EX_TOOLWINDOW = 0x00000080;
            const int WS_EX_TOPMOST = 0x00000008;
            const int WS_EX_NOACTIVATE = 0x08000000;

            var cp = base.CreateParams;
            cp.ExStyle |= WS_EX_TOOLWINDOW | WS_EX_TOPMOST | WS_EX_NOACTIVATE;
            return cp;
        }
    }

    private void PositionNearBottomRight()
    {
        var screen = Screen.FromPoint(Cursor.Position);
        var area = screen.WorkingArea;
        Location = new Point(area.Right - Width - 16, area.Bottom - Height - 16);
    }
}
