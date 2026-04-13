const fs = require('fs');
const path = require('path');

const files = ['home.html', 'profile.html', 'question.html', 'edit-profile.html', 'ask-question.html'];
const publicDir = path.join(__dirname, '..', 'public');

const authScript = `
  <script>
    if (!localStorage.getItem('token')) {
      window.location.href = 'login.html';
    }
  </script>
`;

files.forEach(file => {
    const filePath = path.join(publicDir, file);
    if (fs.existsSync(filePath)) {
        let cnt = fs.readFileSync(filePath, 'utf8');
        if (!cnt.includes("if (!localStorage.getItem('token'))")) {
            cnt = cnt.replace('<head>', '<head>\\n' + authScript);
            fs.writeFileSync(filePath, cnt);
            console.log('Secured', file);
        } else {
            console.log('Already secured', file);
        }
    }
});
