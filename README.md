
# Watch2Gether Clone in Node.js (Express) and Socket.io

![Showcase Image](https://i.ibb.co/gv49NLt/Screenshot-1.png)

This is a mobile responsive Watch2Gether Clone built with Node.js (Express.js) and Socket.io. The clone allows users to watch YouTube videos together, synchronized. Features include a real-time chat, a invitation system, kicking, banning, a playlist as well as roles. Please note that this is one of my older projects, the code might not be using  best practices, we all started somewhere :) Some features still have to be implemented or have to be made better, see below.

<a href="https://watch2gether-clone.onrender.com">View Website</a>

## Features
- [x] **Realtime Sockets**: Users can enjoy real-time video synchronization and chatting using [Socket.io](https://socket.io)
- [x] **Beatiful Video Player**: using [Plyr.io](https://plyr.io)
- [x] **MVC Pattern**: Model-View-Controller directory structure is used in this project, to maintain best practices
- [x] **Security**: set security HTTP headers using [helmet](https://helmetjs.github.io)
- [x] **Compression**: gzip compression with [compression](https://github.com/expressjs/compression)
- [x] **Bootstrap 5 & Pug**: are used to make a good looking website and enable SSR using EJS 
- [x] **Many functionalities**: Video speed control, playlist, chatting, kicking, banning and basic rate limiting

## Features to implement
- Central Error Handling
- Rate limiting everything (preferably using Redis)
- Use Tailwind.css (Bootstrap is a big and uncompressed library)
- Use CSP and CORS (using Helmet)
- Use a frontend framework (React.js / Next.js) for better file seperation
- Optional, authorization

## Getting Started

### Prerequisites

- Node.js (version 12 or higher)

### Installation
1. Get a free Google API Key [here](https://developers.google.com/youtube/v3/getting-started) and activate the Youtube Data API v3

2. Clone the repo

```sh

git clone https://github.com/0xBitBuster/watch2gether-clone.git

```

3. Install NPM packages

```sh

npm install

```

4. Enter your API Key and Server Configuration in `.env`


### Usage

To start the server in development mode, run:
```bash
npm run dev
```
By default, the server runs on `http://localhost:3000`  

## Contributing

Contributions are welcome! If you have a feature request or bug report, please open an issue. If you want to contribute code, please fork the repository and submit a pull request.

  

## License

This project is licensed under the MIT License - see the LICENSE file for details.
