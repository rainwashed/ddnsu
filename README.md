<div align="center">
<h1>DDNSU</h1>
<h3>Dynamic Domain Name Server Updater
</div>

---

### What is DDNSU?
DDNSU dynamic updates DNS records to a user-determined configuration **where the DNS record value is the public-facing IP of the computer in-which it is run on.** It is intended for small servers such as a locally-ran game server with port forwarding where the public IP address is *non reserved* (i.e. it changes periodically due to ISP DHCP rules).

### How to use?
Run ``ddnsu --help`` to list all possible commands.

### Configuration File
The example configuration file can be found [here](./example.config.toml), and it is automatically downloaded in the ``~/.config/ddnsu/`` directory of the local user account.

### Vercel
For vercel auth tokens, ensure that the token generated is a **full-account** token (for some reason the API uses this token).

### Currently Supported Platforms
- Vercel
- Cloudflare

### Supported Systems
The executable builds support both ``x86_64`` and ``aarch64 (arm64)`` systems that run **linux**. However, it can run on any system that can support the Bun runtime by running locally.

### Running Locally
To run the project locally, say for debugging/contributing purposes, ensure that the [Bun runtime](https://bun.sh/) is installed. Additionally, if you want to build an executable, ensure that [bkg](https://github.com/theseyan/bkg) is installed.
1. Clone the GitHub repository \
``git clone https://github.com/rainwashed/ddnsu``
2. Install required dependencies \
``bun install``
3. Run the DDNSU cli \
``bun run .``