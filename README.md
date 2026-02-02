# 🔍 DorkForge

**High-Performance Google Dork Generator & Security Analysis Toolkit**

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-compatible-blue.svg)](https://www.docker.com/)

DorkForge is a professional-grade toolkit designed for security researchers and penetration testers. It automates the discovery of exposed assets and sensitive information by generating precise, high-impact Google Dorks using advanced permutation logic and multi-model AI integration.

---

## 🎯 Key Components

### 🖥️ Web Interface: The Control Center
The DorkForge Web UI provides a centralized hub for managing discovery operations:
*   **Interactive Generation**: Browse through 15+ specialized categories (Cloud Buckets, Financial Data, IoT Infrastructure) to launch targeted scans.
*   **AI-Driven Discovery**: Simply describe your target in natural language (e.g., *"Find exposed database backups for example.com"*) and let the AI agents do the heavy lifting.
*   **Real-time Validation**: Integrated hallucination detection helps ensure generated dorks adhere to valid search operator syntax.
*   **Secure Vault**: Manage API keys for OpenAI, Gemini, Claude, and more in a local, masked environment.

### ⌨️ CLI: Automator's Choice
For those who live in the terminal, DorkForge offers a feature-rich CLI designed for speed and integration:
*   **Builder Mode**: `python cli.py builder` — An interactive, menu-driven wizard that helps you craft complex dorks with fuzzy search and undo capabilities.
*   **Smart Inference**: Run `python cli.py "test.com"` and DorkForge will intelligently guess your intent and suggest relevant categories.
*   **Permutator Utility**: Instantly explode a single dork into dozens of variations to bypass filters or uncover hidden paths.
*   **Flexible Export**: Export your results to **CSV**, **JSON**, or **TXT** formats directly after generation.

---

## 🚀 Installation

### Method 1: Docker (Fastest)

```bash
git clone https://github.com/mhmtayberk/DorkForge.git
cd dorkforge
docker compose up -d --build
```
Access the dashboard at **http://localhost:8080**.

### Method 2: Python (Local Development)

```bash
git clone https://github.com/mhmtayberk/DorkForge.git
cd dorkforge
pip install -r requirements.txt
python app.py
```

### Method 3: Browser Extension

Run DorkForge logic directly while browsing:
1.  Navigate to `chrome://extensions`.
2.  Enable **Developer mode**.
3.  Click **Load unpacked** and select the `extension/` directory.

---

## ⚙️ Configuration

Manage your environment via the Web UI Settings or a `.env` file:
```env
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant...
OLLAMA_BASE_URL=http://localhost:11434
```
## 🔐 Security

DorkForge is designed with a security-first approach to protect your sensitive API keys:

*   **Local Storage**: API keys are stored in a local `.env` file for the web application and `chrome.storage.local` for the browser extension. No keys are ever transmitted to DorkForge servers.
*   **Environment Protection**: The web application automatically attempts to set `.env` file permissions to `0600` (read/write only by owner) to prevent other local users from accessing your keys.
*   **Extension Security**: The browser extension utilizes local storage for persistence. While common, users are advised to use secure browser profiles and be aware that data is unencrypted on the local disk.

> [!IMPORTANT]
> For maximum security in production environments, consider running DorkForge inside an encrypted volume or using a dedicated secret management solution.

## 🤝 Contribution

Contributions are what make the open-source community an amazing place to learn, inspire, and create.
1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---
**Disclaimer:** *This tool is for authorized security testing only. Use responsibly.*
