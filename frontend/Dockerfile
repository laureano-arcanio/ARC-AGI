# Use an official Node runtime as a parent image
FROM node:20

# Set the working directory
WORKDIR /app

# Remove existing node_modules
RUN rm -rf node_modules

# Create node_modules directory
RUN mkdir -p /app/node_modules

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json ./
COPY pnpm-lock.yaml ./

# Set development environment
ENV NODE_ENV=development

# Install dependencies using pnpm
RUN pnpm install

# Copy the rest of your app's source code
COPY . .

# Expose port 3000 to have it mapped by Docker daemon
EXPOSE 3000

# Command to run the app
CMD ["pnpm", "run", "dev"]