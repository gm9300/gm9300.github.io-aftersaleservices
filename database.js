const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'blog.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function initDatabase() {
  // 重建表结构，增加 category 字段
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      file_path TEXT,
      tags TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 插入新的模块示例数据
  const count = db.prepare('SELECT COUNT(*) as count FROM posts').get();
  if (count.count === 0) {
    console.log('正在初始化文档中心数据...');
    const insert = db.prepare('INSERT INTO posts (title, content, file_path, tags, category) VALUES (?, ?, ?, ?, ?)');
    
    insert.run('机器獒规格书', '详细记录了X1型号机器人的硬件参数与性能指标...', '/files/x1_spec.pdf', '硬件,规格', '产品介绍文件');
    insert.run('售后及开发协议', '关于代码开源、版权与责任的法律声明...', '/files/license.pdf', '法律,协议', '协议');
    insert.run('调试工具包', '适用于 Windows 10/11 与 Linux的官方工具...', '/files/debug_tool.exe', '工具,下载', '开发软件下载');
    insert.run('SDK接口开发文档', '包含设备SDK开发文档以及SDK示例...', '/files/api_doc.md', 'SDK,开发', '开发文件');
    insert.run('设备快速入门指南', '如何开箱、连接网络并进行首次配置...', '/files/quick_start.pdf', '入门,使用', '产品使用');
    insert.run('进阶使用开发教程及视频', '手把手教你如何刷入最新版本的系统固件...', '/files/update_video.mp4', '视频,升级', '视频教程');
    
    console.log('文档中心数据初始化完成。');
  }
}

// 支持按分类和关键词双重筛选
function searchPosts(query, category) {
  let sql = "SELECT * FROM posts WHERE 1=1";
  let params = [];

  if (category && category !== '全部') {
    sql += " AND category = ?";
    params.push(category);
  }

  if (query && query.trim() !== '') {
    sql += " AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)";
    const searchTerm = `%${query}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  sql += " ORDER BY created_at DESC";
  return db.prepare(sql).all(...params);
}

module.exports = { initDatabase, searchPosts };