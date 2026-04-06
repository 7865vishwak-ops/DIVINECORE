const http = require('http');
const https = require('https');

// --- CONFIGURATION ---
// We use process.env so Render can hide your key from hackers
const API_KEY = process.env.GROQ_API_KEY; 
const PORT = process.env.PORT || 5000; 

const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const parsedBody = JSON.parse(body);
                const userPrompt = parsedBody.prompt;

                const payload = JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: userPrompt }]
                });

                const options = {
                    hostname: 'api.groq.com',
                    path: '/openai/v1/chat/completions',
                    method: 'POST',
                    headers: { 
                        'Authorization': 'Bearer ' + API_KEY, 
                        'Content-Type': 'application/json' 
                    }
                };

                const apiReq = https.request(options, (apiRes) => {
                    let data = '';
                    apiRes.on('data', d => data += d);
                    apiRes.on('end', () => {
                        try {
                            const aiResponse = JSON.parse(data).choices[0].message.content;
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ result: aiResponse }));
                        } catch (err) {
                            res.end(JSON.stringify({ result: "API Parsing Error." }));
                        }
                    });
                });

                apiReq.on('error', (e) => {
                    res.end(JSON.stringify({ result: "Connection Error to Groq." }));
                });

                apiReq.write(payload);
                apiReq.end();

            } catch (e) { 
                res.end(JSON.stringify({ result: "Engine Error." })); 
            }
        });
    } else {
        // --- THIS SERVES YOUR BEAUTIFUL UI ---
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Divine Pro | Locked Engine</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0d0d0e;
            --accent: #4285f4;
            --glass: rgba(255, 255, 255, 0.05);
            --glass-border: rgba(255, 255, 255, 0.1);
            --divine-gradient: linear-gradient(135deg, #4285f4, #9b72cb, #ffcf4d);
        }

        body, html {
            margin: 0; padding: 0; height: 100vh; overflow: hidden;
            background: var(--bg); color: #e3e3e3; font-family: 'Outfit', sans-serif;
        }

        #loader { position: fixed; inset: 0; background: #000; z-index: 10000; display: flex; justify-content: center; align-items: center; transition: 0.5s; pointer-events: none;}
        .loader-star { width: 50px; height: 50px; background: var(--divine-gradient); mask: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z'/%3E%3C/svg%3E") center/contain no-repeat; -webkit-mask: url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z'/%3E%3C/svg%3E") center/contain no-repeat; animation: spin 2s infinite linear; }
        @keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} }

        .app-container { display: flex; height: 100vh; width: 100vw; }

        #sidebar { width: 240px; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; padding: 20px; z-index: 100; }
        .nav-btn { background: var(--glass); border: 1px solid transparent; color: #fff; padding: 12px; border-radius: 12px; cursor: pointer; transition: 0.3s; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; }
        .nav-btn:hover { border-color: var(--accent); background: rgba(255,255,255,0.1); }

        .main-content { flex: 1; display: flex; flex-direction: column; position: relative; background: #0d0d0e; }
        #chat-feed { flex: 1; overflow-y: auto; padding: 40px 15%; display: flex; flex-direction: column; gap: 20px; scroll-behavior: smooth; }
        
        .msg { display: flex; gap: 15px; animation: fadeInUp 0.4s ease; }
        .ai-msg .content { color: #ddd; background: var(--glass); padding: 15px; border-radius: 15px; border: 1px solid var(--glass-border); max-width: 85%; line-height: 1.5; }
        .user-msg { justify-content: flex-end; }
        .user-msg .content { background: var(--accent); color: #fff; padding: 10px 20px; border-radius: 20px 20px 0 20px; }

        .modal { position: absolute; inset: 15px; background: #111; border: 1px solid var(--accent); border-radius: 20px; display: none; z-index: 2000; flex-direction: column; overflow: hidden; box-shadow: 0 0 100px #000; }
        .modal-header { padding: 12px 20px; display: flex; justify-content: space-between; background: #000; align-items: center; border-bottom: 1px solid #222; }

        #game-frame { flex: 1; border: none; background: #000; width: 100%; height: 100%; }

        .action-area { padding: 20px 15% 40px; position: relative; z-index: 50; }
        .pill { background: #1a1b1e; border-radius: 50px; padding: 10px 20px; display: flex; align-items: center; gap: 12px; border: 1px solid var(--glass-border); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        #chat-input { flex: 1; background: none; border: none; color: #fff; outline: none; font-size: 1rem; }
        .icon-btn { background: none; border: none; color: #666; cursor: pointer; font-size: 1.3rem; transition: 0.2s; }
        .icon-btn:hover { color: var(--accent); }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div id="loader"><div class="loader-star"></div></div>
    <div class="app-container">
        <aside id="sidebar">
            <div style="margin-bottom:30px; font-weight:900; color:var(--accent); font-size: 1.2rem; letter-spacing: 1px;">DIVINE CORE</div>
            <button class="nav-btn" onclick="UI.toggleModal('game-modal')">🎮 All Games (In-AI)</button>
            <button class="nav-btn" onclick="UI.toggleModal('vision-modal')">👁️ Vision Engine</button>
        </aside>

        <main class="main-content">
            <div id="chat-feed"></div>
            <div id="game-modal" class="modal">
                <div class="modal-header"><strong>INTERNAL ARCADE</strong><span onclick="UI.toggleModal('game-modal')" style="cursor:pointer; font-size:1.5rem">✕</span></div>
                <iframe id="game-frame" sandbox="allow-scripts allow-same-origin allow-forms" src="about:blank"></iframe>
            </div>

            <div class="action-area">
                <div class="pill">
                    <button class="icon-btn" onclick="UI.toggleModal('vision-modal')">👁️</button>
                    <button class="icon-btn" onclick="UI.toggleModal('game-modal')">🎮</button>
                    <input type="text" id="chat-input" placeholder="Communicate with Divine Core...">
                    <button class="icon-btn" style="color:var(--accent)" onclick="UI.send()">➤</button>
                </div>
            </div>
        </main>
    </div>

    <script>
        const UI = {
            init() {
                setTimeout(() => {
                    const l = document.getElementById('loader');
                    l.style.opacity = '0';
                    setTimeout(() => l.style.display = 'none', 500);
                }, 1000);
                this.addMsg("Divine Core Online. Node.js Engine Active.", 'ai');
                document.getElementById('chat-input').addEventListener('keypress', (e) => { if(e.key === 'Enter') this.send(); });
            },
            toggleModal(id) {
                const m = document.getElementById(id);
                const isOpen = m.style.display === 'flex';
                m.style.display = isOpen ? 'none' : 'flex';
                if (id === 'game-modal' && !isOpen) {
                    document.getElementById('game-frame').src = "https://www.gamepix.com/"; 
                }
            },
            addMsg(text, type) {
                const feed = document.getElementById('chat-feed');
                feed.innerHTML += '<div class="msg ' + type + '-msg"><div class="content">' + text + '</div></div>';
                feed.scrollTo(0, feed.scrollHeight);
            },
            async send() {
                const inp = document.getElementById('chat-input');
                const val = inp.value;
                if(!val) return;
                this.addMsg(val, 'user');
                inp.value = "";
                const response = await fetch('/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: val })
                });
                const data = await response.json();
                this.addMsg(data.result, 'ai');
            }
        };
        UI.init();
    </script>
</body>
</html>
        `);
    }
});

server.listen(PORT, () => console.log("DIVINE CORE ONLINE ON PORT " + PORT));