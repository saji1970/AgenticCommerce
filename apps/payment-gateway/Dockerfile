FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Clean old build artifacts and compile fresh
RUN rm -rf dist && npx tsc

EXPOSE 3003

CMD ["node", "dist/server.js"]
