FROM tailscale/tailscale:stable

# Install Node.js (v20 LTS) and npm using Alpine packages
RUN apk update && \
    apk add --no-cache nodejs npm bash curl socat

# Create app directory
RUN mkdir -p /app
WORKDIR /app
COPY  ./public /app/public
COPY ./db /app/db
COPY ./server.js /app/server.js
COPY ./package.json /app/package.json

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

ENV LG_USERNAME=admin@gmail.com
ENV LG_PASSWD=admin@gmail.com

# Use JSON-form CMD to fix the warning
CMD ["/start.sh"]
