# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
# Copy minimal server package
COPY package.json /app/package.json
COPY mail-server.cjs /app/mail-server.cjs
RUN npm install --omit=dev
ENV MAIL_BRIDGE_PORT=5123
ENV PORT=5123
EXPOSE 5123
CMD ["npm", "start"]
