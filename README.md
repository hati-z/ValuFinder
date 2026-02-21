# ValuFinder 📈

ValuFinder is a premium, beautifully designed stock screener built specifically for finding high-quality, high-value investments. It features a modern dark theme and live market data.

![ValuFinder Demo](./.github/demo.png) *(Note: Add a screenshot here later)*

## Features

- **Real-time Market Data:** Automatically fetches live prices, Forward P/E, and Return on Equity (ROE) using Yahoo Finance.
- **Fundamental Quality Filters:** Leverages Return on Equity to automatically tag companies as `Exceptional` (>25%) or `High` (>15%) quality.
- **Valuation Controls:** Interactive sliders to aggressively filter out expensive, high-P/E stocks.
- **Zero API Keys Required:** Runs entirely free via a lightweight Python proxy utilizing the open source `yfinance` library.
- **Premium UI:** Glassmorphism, smooth animations, and a curated color palette built entirely with Vanilla CSS.

## Project Structure

The codebase is split cleanly between the frontend UI and the backend data proxy:

- `/public`: Contains the ultra-fast Vanilla HTML, CSS, and JavaScript UI.
- `/api`: Contains the Python Flask backend that connects to Yahoo Finance.

## Quick Start (Local Setup)

To run this application locally, you need to spin up both the backend API and the frontend client. You will need Python 3 installed.

### 1. The Easy Way (Mac/Linux)
Simply run the included startup script from the root directory:
```bash
./start.sh
```
This automatically handles virtual environments, dependencies, and boots up both servers.

### 2. The Manual Way
**Start the Backend (Terminal 1):**
```bash
cd api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

**Start the Frontend (Terminal 2):**
```bash
cd public
python3 -m http.server 8000
```
Then navigate to `http://localhost:8000` in your browser.

## Tech Stack
- Frontend: HTML5, CSS3 (Custom Dark Theme), Vanilla JavaScript
- Backend: Python, Flask, `yfinance`, `flask-cors`
