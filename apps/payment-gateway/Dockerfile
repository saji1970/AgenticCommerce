FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies (skip postinstall build - we compile after copying source)
COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts

# Copy source code and config
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript from source
RUN npx tsc

EXPOSE 3003

CMD ["node", "dist/server.js"]
