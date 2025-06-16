# Use official Node.js runtime as base image
FROM node:18-slim

# Install system dependencies required for Puppeteer
RUN apt-get update \
    && apt-get install -y wget gnupg dbus dbus-x11 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

#ENV DBUS_SESSION_BUS_ADDRESS autolaunch:

RUN dbus-uuidgen > /etc/machine-id

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

RUN chmod 755 /usr/src/app/user_data
# Create a non-root user to run the application
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /usr/src/app

# Switch to non-root user
USER pptruser


ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable


# Expose port (adjust as needed)
EXPOSE 8766

# Command to run the application
CMD ["node", "src/server.js", "-d", "user_data"]