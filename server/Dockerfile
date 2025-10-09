# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
# Copy minimal server package
COPY server/package.json /app/package.json
COPY server/mail-server.cjs /app/mail-server.cjs
RUN npm install --omit=dev
ENV MAIL_BRIDGE_PORT=5123
ENV PORT=5123
EXPOSE 5123
CMD ["npm", "start"]
