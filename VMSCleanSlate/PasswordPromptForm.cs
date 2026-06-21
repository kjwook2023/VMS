using System.Drawing;

namespace VMSCleanSlate;

public sealed class PasswordPromptForm : Form
{
    private readonly TextBox _passwordTextBox;

    public string EnteredPassword => _passwordTextBox.Text;

    public PasswordPromptForm(string targetName)
    {
        Text = "설정 암호 확인";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        StartPosition = FormStartPosition.CenterScreen;
        MaximizeBox = false;
        MinimizeBox = false;
        ShowInTaskbar = false;
        TopMost = true;
        ClientSize = new Size(360, 150);
        BackColor = Color.White;
        Font = new Font("Segoe UI", 9.5f);

        var titleLabel = new Label
        {
            Text = $"{targetName}을(를) 열려면 암호를 입력하세요.",
            Location = new Point(18, 18),
            Size = new Size(324, 22)
        };
        Controls.Add(titleLabel);

        _passwordTextBox = new TextBox
        {
            Location = new Point(18, 52),
            Size = new Size(324, 24),
            UseSystemPasswordChar = true
        };
        Controls.Add(_passwordTextBox);

        var okButton = new Button
        {
            Text = "확인",
            DialogResult = DialogResult.OK,
            Location = new Point(166, 96),
            Size = new Size(84, 30)
        };
        okButton.Click += (_, _) =>
        {
            if (string.IsNullOrWhiteSpace(_passwordTextBox.Text))
            {
                DialogResult = DialogResult.None;
                MessageBox.Show(
                    "암호를 입력하세요.",
                    "VMSCleanSlate",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
        };
        Controls.Add(okButton);

        var cancelButton = new Button
        {
            Text = "취소",
            DialogResult = DialogResult.Cancel,
            Location = new Point(258, 96),
            Size = new Size(84, 30)
        };
        Controls.Add(cancelButton);

        AcceptButton = okButton;
        CancelButton = cancelButton;
    }
}
