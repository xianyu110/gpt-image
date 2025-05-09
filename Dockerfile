# 构建阶段
FROM node:18-alpine as builder

# 创建应用目录
WORKDIR /app

# 添加npm配置 - 提前设置，加速下载
RUN npm config set registry https://registry.npmmirror.com
RUN npm config set fetch-timeout 600000

# 先复制package.json和package-lock.json
COPY package*.json ./

# 安装所有依赖
RUN npm install

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/package*.json ./

# 只安装生产依赖
RUN npm install --production

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV MAX_USAGE_COUNT=10

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "server.js"] 