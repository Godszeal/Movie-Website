# CineMind - Movie & TV Series Streaming Website

A premium, Netflix-like movie and TV series discovery and streaming interface powered by the ZSTLab API.

[![GitHub repository](https://img.shields.io/badge/GitHub-Godszeal%2FMovie--Website-181717?logo=github)](https://github.com/Godszeal/Movie-Website)
[![Stars](https://img.shields.io/badge/stars-0-181717?logo=github)](https://github.com/Godszeal/Movie-Website/stargazers)
[![Forks](https://img.shields.io/badge/forks-0-181717?logo=github)](https://github.com/Godszeal/Movie-Website/network/members)
[![Issues](https://img.shields.io/badge/issues-0-181717?logo=github)](https://github.com/Godszeal/Movie-Website/issues)
[![Vercel deployment](https://img.shields.io/badge/deployed%20on-Vercel-000000?logo=vercel&logoColor=white)](https://movie-website-alpha-one.vercel.app/)

## Features

- **Netflix-like UI** - Dark cinematic theme with glassmorphism effects
- **Smart Search** - Real-time search suggestions with debouncing
- **Hero Carousel** - Featured content with auto-play
- **Movie Cards** - Hover effects, ratings, badges
- **Fully Responsive** - Optimized for mobile, tablet, and desktop
- **Video Player** - Custom player with subtitles, download, speed control, and quality selection
- **Secure Media Proxy** - Same-origin range-aware media and subtitle forwarding with upstream host validation
- **TV Series Support** - Horizontal season/episode selection with per-episode watch and download actions
- **Quality Selection** - Choose 360p, 480p, 1080p, or other qualities before streaming or downloading
- **Subtitle Downloads** - Language-labeled subtitle downloads for available movie or episode tracks, with SRT-to-WebVTT timing conversion
- **Watchlist** - Save favorites with localStorage
- **Share** - Web Share API integration
- **SEO Optimized** - Dynamic meta tags, Open Graph, Twitter Cards
- **Static Site** - Deploy anywhere, no backend required

## Tech Stack

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Font Awesome](https://img.shields.io/badge/Font_Awesome-339AF0?style=for-the-badge&logo=fontawesome&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Godszeal/Movie-Website)

## How to Deploy

### Option 1: Deploy with Vercel (Recommended)

1. Click the "Deploy with Vercel" button above
2. Or import the repository in your Vercel dashboard
3. Vercel will automatically detect the static site and deploy it
4. That's it! No build step required.

### Option 2: Manual Deploy

1. **Clone or download** this repository:
   ```bash
   git clone https://github.com/Godszeal/Movie-Website.git
   cd Movie-Website
   ```

2. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Or upload to any static hosting**:
   - Upload all files to Netlify, Cloudflare Pages, GitHub Pages, or any web host
   - Ensure `config.json` is at the root
   - Ensure `vercel.json` is at the root for proper routing

## Configuration

All website settings can be customized from a single `config.json` file. No need to edit any JavaScript files.

### Available Settings

- **Site**: Name, description, URL, logo, favicon
- **Branding**: Colors, border radius
- **Theme**: Dark/light mode, animations, glassmorphism
- **API**: Base URL, API key, search settings, pagination
- **Navigation**: Menu items
- **Features**: Toggle features on/off
- **Player**: Autoplay, default volume, playback speed
- **Footer**: Text and links
- **Social**: Telegram, WhatsApp, YouTube, Twitter, Facebook, Instagram
- **SEO**: Title template, description, keywords

### Example Configuration

```json
{
  "site": {
    "name": "CineMind",
    "description": "Discover and stream the latest movies and TV series.",
    "url": "https://yourdomain.com"
  },
  "branding": {
    "primaryColor": "#e50914",
    "backgroundColor": "#141414",
    "surfaceColor": "#1f1f1f"
  },
  "api": {
    "apiKey": "YOUR_API_KEY"
  }
}
```

## API Endpoints Used

| Endpoint | Description |
|----------|-------------|
| `GET /api/homepage` | Homepage sections and banner |
| `GET /api/search` | Search movies and series |
| `GET /api/search-suggestion` | Search suggestions |
| `GET /api/popular-searches` | Popular search terms |
| `GET /api/hot-movies-series` | Hot movies and series |
| `GET /api/trending` | Trending content |
| `GET /api/item-details` | Movie/series details |
| `GET /api/recommendations` | Similar content |
| `GET /api/media` | Stream URLs, download links, and subtitle tracks |
| `GET /api/proxy?url=...` | Same-origin media/subtitle proxy with range forwarding |

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `index.html` | Hero carousel, hot movies, trending, sections |
| Search | `search.html?q=QUERY` | Search results with pagination |
| Details | `details.html?id=SUBJECT_ID` | Movie/series details, cast, episodes |
| Watch | `watch.html?id=SUBJECT_ID` | Video player with controls |
| Watchlist | `watchlist.html` | Saved movies and series |

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project for your own streaming website.

## Credits

- **Developed by**: [Godszeal](https://github.com/Godszeal)
- **Powered by**: [ZSTLab](https://zstlab.cyou)
- **API**: ZSTLab Movie & Series API

## Support

If you like this project, please give it a ⭐ on GitHub!

For issues or feature requests, please use the [GitHub Issues](https://github.com/Godszeal/Movie-Website/issues) page.

---

Built with ❤️ by [Godszeal](https://github.com/Godszeal)

## Live screenshot gallery

The following screenshots were captured from the live Vercel deployment at 390 × 844px mobile and 1440px desktop viewports. They cover the primary pages and demonstrate the responsive header, details actions, horizontal episode picker, quality controls, subtitle controls, and player download control.

| Page | Desktop preview | Mobile preview |
|---|---|
| Home | ![Home desktop](docs/screenshots/live/2026-08-27/home-1440.png) | ![Home mobile](docs/screenshots/live/2026-08-27/home-390.png) |
| Search | ![Search desktop](docs/screenshots/live/2026-08-27/search-1440.png) | ![Search mobile](docs/screenshots/live/2026-08-27/search-390.png) |
| Details | ![Details desktop](docs/screenshots/live/2026-08-27/details-1440.png) | ![Details mobile](docs/screenshots/live/2026-08-27/details-390.png) |
| Details episodes | ![Episodes desktop](docs/screenshots/live/2026-08-27/details-episodes-1440.png) | ![Episodes mobile](docs/screenshots/live/2026-08-27/details-episodes-390.png) |
| Watch/player | ![Player desktop](docs/screenshots/live/2026-08-27/player-1440.png) | ![Player mobile](docs/screenshots/live/2026-08-27/player-390.png) |
| Watchlist | ![Watchlist desktop](docs/screenshots/live/2026-08-27/watchlist-1440.png) | ![Watchlist mobile](docs/screenshots/live/2026-08-27/watchlist-390.png) |

## Numbered theme previews

CineMind supports an extensible numbered visual system. The active style is controlled from `config.json` and is applied across every page:

```json
{
  "theme": {
    "styleId": 1
  }
}
```

Change `styleId` to `2`, `3`, `4`, `5`, `6`, or `7` to select one of the current presets. New themes can be added later using higher numbers without changing page markup or the API client.

### Desktop theme previews

| Style 1 | Style 2 | Style 3 |
|---|---|---|
| ![Style 1 desktop](docs/screenshots/themes/theme-1-desktop.png) | ![Style 2 desktop](docs/screenshots/themes/theme-2-desktop.png) | ![Style 3 desktop](docs/screenshots/themes/theme-3-desktop.png) |
| ![Style 4 desktop](docs/screenshots/themes/theme-4-desktop.png) | ![Style 5 desktop](docs/screenshots/themes/theme-5-desktop.png) | ![Style 6 desktop](docs/screenshots/themes/theme-6-desktop.png) |

![Style 7 desktop](docs/screenshots/themes/theme-7-desktop.png)

### Mobile theme previews

| Style 1 | Style 2 | Style 3 | Style 4 |
|---|---|---|---|
| ![Style 1 mobile](docs/screenshots/themes/theme-1-mobile.png) | ![Style 2 mobile](docs/screenshots/themes/theme-2-mobile.png) | ![Style 3 mobile](docs/screenshots/themes/theme-3-mobile.png) | ![Style 4 mobile](docs/screenshots/themes/theme-4-mobile.png) |
| ![Style 5 mobile](docs/screenshots/themes/theme-5-mobile.png) | ![Style 6 mobile](docs/screenshots/themes/theme-6-mobile.png) | ![Style 7 mobile](docs/screenshots/themes/theme-7-mobile.png) | |

The screenshots are visual previews of the configured style layer. They do not embed API credentials or runtime data.

## Media and episode behavior

Series seasons are rendered as horizontal, touch-scrollable episode rails so long episode lists do not force a narrow mobile layout or cause page-wide overflow. Each episode has independent **Watch**, **Download**, and **Subtitles** actions, and the details-page media panel refreshes when the selected episode changes.
The media panel reads the subtitle tracks returned by `GET /api/media`, displays each track's language name and code, and routes downloads through the configured same-origin proxy. Stream and download URLs are normalized so provider-generated proxy links are unwrapped before they are sent through the CineMind host proxy. The server proxy forwards `Host`, `Referer`, `Origin`, range requests, redirects, and upstream content metadata, while rejecting unsupported hosts and direct non-browser-looking requests with `Forbidden`.
Quality selection is available for both movies and series. The Watch Now, Download Movie, episode Watch, and episode Download actions fetch the current media payload and open a modal listing each available quality. For series, the request uses the selected season and episode, and the generated filename includes the title, season, episode, quality, and subtitle language where applicable.
### Stream reliability and proxy notes
The Vercel media endpoint runs on the Edge Runtime. It validates HTTPS targets, returns plain `Forbidden` for direct non-browser-looking requests, forwards `Host`, `Referer`, `Origin`, redirects, and byte ranges, and preserves `Content-Range`, `Content-Length`, and `Accept-Ranges` headers. When an upstream CDN rejects the Vercel egress address, the proxy retries through the configured provider path with a browser signature and a cache-busting key.
For MP4 playback, the proxy uses cache-busted ranged requests and returns standards-compliant `206 Partial Content` responses. Frontend stream, download, and subtitle links also receive cache-busting parameters so signed URLs and previously cached ranges are not reused. Subtitle SRT files are converted to valid WebVTT, both timestamp separators are normalized, provider delay offsets are applied, and the selected track is explicitly set to `showing`. The live deployment was syntax-checked and verified with 360p, 480p, and 1080p choices, episode-specific download qualities, and 891 parsed English subtitle cues.
