# <img src="https://github.com/project-blurple/Canvas-Web/assets/33956381/86000a76-a73b-4abe-8c61-05dbfecbec40" width="24" height="24" /> Blurple Canvas Web

<p align="center">
  <img src="https://github.com/user-attachments/assets/347c5873-6859-40c1-a6de-25a326aad2a6" width="450" height="450" alt="Final canvas from 2026" />
</p>

## <img src="https://github.com/project-blurple/Canvas-Web/assets/33956381/02ac039f-67da-4aeb-a7be-c0363fee3917" width="20" height="20" /> Project Blurple

[Project Blurple](https://projectblurple.com) is an annual, week-long,
community-run event which celebrates Discord’s anniversary. Part of this is
Blurple Canvas where people in participating servers create pixel art on a
shared canvas.

Blurple Canvas Web is a web alternative to the
[existing Discord bot](https://github.com/Rocked03/Blurple-Canvas) Discord bot.

## 🥪 Tech stack & repo structure

This is a [monorepo](https://monorepo.tools), with three packages:

- **[@blurple-canvas-web/backend](/packages/backend#readme)**: The
  [Node](https://nodejs.org)–[Express](https://expressjs.com) back-end server
- **[@blurple-canvas-web/frontend](/packages/frontend#readme)**: The
  [Next.js](https://nextjs.org) front-end
- **[@blurple-canvas-web/types](/packages/types#readme)**: Where
  [TypeScript](https://www.typescriptlang.org) types shared by the front- and
  back-end live

Worth noting:

- **backend** talks to the same [PostgreSQL](http://www.postgresql.org) as the
  [Blurple Canvas](https://github.com/Rocked03/Blurple-Canvas) Discord bot;
- [Prisma](https://www.prisma.io) serves as the ORM layer.
- With the odd exception, **frontend** makes queries to the **backend** API with
  [TanStack Query](https://tanstack.com/query).
- Realtime canvas updates are pushed to clients with
  [Socket.IO](https://socket.io). Primarily, this is for streaming pixels to
  everyone as they get placed.
- We make a bit of an effort to do right by the
  [Web Accessibility Content Guidelines](https://www.w3.org/TR/WCAG21).[^wcag]

[^wcag]: Plenty of room to improve, we realise.

## 🌱 Getting started

### ☑️ Prerequisites

> [!WARNING] Windows users, these instructions assume you use
> [WSL](https://learn.microsoft.com/en-us/windows/wsl). You’re welcome to use
> PowerShell—things still work—but you’ll have to “translate” these steps for
> yourself.

**[nvm](https://github.com/nvm-sh/nvm) & [Node.js](https://nodejs.org).** Node
Version Manger optional but recommended. Just make sure your Node version
matches [`/.nvmrc`](/.nvmrc).

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash  # …or… `brew install nvm`
nvm --version   # Shouldn’t error
nvm install
node --version  # Should match .nvmrc
```

**[Corepack](https://nodejs.org/api/corepack.html) & [pnpm](https://pnpm.io).**
Corepack optional but recommended. If you’d prefer installing pnpm some other
way, [go ahead](https://pnpm.io/installation).

```sh
npm install --global corepack  # or `brew install corepack`
corepack enable pnpm
corepack --version             # Shouldn’t error
pnpm --version                 # Should match package.json → engines
```

**[PostgreSQL](https://www.postgresql.org) 17+.** 👉
https://www.postgresql.org/download

### 🧱 Install dependencies

```sh
pnpm install
```

### 🤫 Secrets & environment variables

The **[backend](/packages/backend/.env.example)** and
**[frontend](/packages/frontend/.env.example)** packages need to have some
environment variables set work correctly (in `/packages/backend/.env` and
`/packages/frontend/.env`, respectively). Consult the `.env.example` files in
each of those packages to see what variables are needed, and contact one of the
[maintainers](#-maintainers) if you need any secrets.

### 💽 Database

Create a database (for example, `canvas`); and set `DATABASE_URL` in
`packages/backend/.env` to point to it.

With the database server running:

```sh
pnpm install
# Build backend once, so generated scripts can import the built client
pnpm -F backend run build
# Set up database
pnpm run prisma:migrate && pnpm run prisma:seed
```

### 🚀 Build & deploy

From repo root:

```sh
pnpm run dev                      # with hot reloading…
pnpm run build && pnpm run start  # …or without
```

If you want to run the front- and back-ends in different terminals:

```sh
pnpm -F backend run dev
pnpm -F frontend run dev
```

## 🤓 Maintainers

Blurple Canvas Web started as a
[SOFTENG 750](https://courseoutline.auckland.ac.nz/dco/course/SOFTENG/750)
project at [Waipapa Taumata Rau](https://www.auckland.ac.nz). Availabilities and
contributions ebb and flow, but these folks remain reasonable people to contact
if you need to get in touch with a core contributor
[Samuel Ou](https://sjou.dev), [Jasper Lai](https://lai.nz),
[Josh Jeffers](https://pumbas.net), [Henry Wang](http://henryh.wang),
[Aaron Guo](https://github.com/PolarWolf314),
[Emily Zou](https://github.com/boxy8).[^team-name]

[^team-name]:
    Dig back
    [far enough in the commit history](https://github.com/project-blurple/Canvas-Web/tree/32549bada3a5636045955beb35812c3e09ef074e),
    and you’ll find that we once had the team name
    [Golden Giraffes](https://github.com/project-blurple/Canvas-Web/blob/32549bada3a5636045955beb35812c3e09ef074e/group-image/Golden%20Giraffes.webp).
    Not sure we would’ve chosen this name for ourselves, though…

## 💌 Acknowledgements

Blurple Canvas Web wouldn’t exist without these lovely people and projects.
Thanks to:

- [Project Blurple](https://projectblurple.com) and the Project Blurple
  community, for obvious reasons;
- [Rocked03](https://rocked03.dev) for creating the
  [Blurple Canvas](https://github.com/Rocked03/Blurple-Canvas) Discord
  bot;[^samuel]
- the [Place Atlas Initiative](https://github.com/placeAtlas) for their efforts
  cataloguing r/Place;
- [Josh Wardle](https://www.powerlanguage.co.uk) and
  [r/Place](https://www.reddit.com/r/place) participants (no introduction
  needed); and
- you, for your interest in this project!

[^samuel]:
    Pretty sure Samuel isn’t happy about me putting him on this list. Tough
    cookies.&emsp;—Jasper
