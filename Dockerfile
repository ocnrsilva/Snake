# Estágio de Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copia arquivos de dependências
COPY package.json ./

# Instala todas as dependências
RUN npm install

# Copia o restante do código-fonte
COPY . .

# Compila o projeto React/Vite para a pasta /dist
RUN npm run build

# Estágio de Execução com Nginx leve
FROM nginx:alpine

# Copia a configuração personalizada do Nginx para suporte a SPA e PWA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o build estático para o diretório raiz do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expõe a porta interna 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
