# 1. Punto de partida: Usamos una imagen oficial de Node.js v20 (LTS)
FROM node:20

# 2. Establecemos el directorio de trabajo DENTRO del contenedor
# Todo lo que hagamos será relativo a esta carpeta /app
WORKDIR /app

# 3. Copiamos los archivos de dependencias
# Esto es un truco de Docker para usar el caché. Si no cambias tus
# dependencias, Docker no volverá a instalar todo.
COPY package.json ./
COPY package-lock.json ./

# 4. Instalamos las dependencias
RUN npm install

# 5. Copiamos el resto del código de tu proyecto
# (Esto se sobrescribirá con el "volumen" de hot-reload,
# pero es bueno tenerlo para construir la imagen)
COPY . .

# 6. Exponemos el puerto que usa tu API (¡el que pusiste en el .yml!)
EXPOSE 4000

# 7. El comando para iniciar tu servidor
# Aquí estoy asumiendo que tu package.json tiene un script "start"
CMD ["node", "index.js"]