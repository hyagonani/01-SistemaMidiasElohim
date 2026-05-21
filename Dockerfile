FROM node:20-alpine

WORKDIR /app

# Instala as dependências primeiro (aproveita cache de camadas do Docker)
COPY package*.json ./
RUN npm ci

# Copia o resto do código da aplicação
COPY . .

# Compila o projeto Next.js
RUN npm run build

# Expõe a porta que o Next.js roda por padrão
EXPOSE 3000

# Inicia o servidor do Next.js
CMD ["npm", "start"]
