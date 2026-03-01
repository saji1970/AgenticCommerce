FROM node:20-slim

WORKDIR /app

# Ensure devDependencies (typescript) are installed even if NODE_ENV=production
ENV NODE_ENV=development

# Copy package files and install dependencies (skip postinstall to avoid premature tsc)
COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts

# Copy source code and config
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript from source
RUN npx tsc

# Switch to production for runtime
ENV NODE_ENV=production

EXPOSE 3003

CMD ["node", "dist/server.js"]
