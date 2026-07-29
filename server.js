const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// ==========================================
// 1. 静态资源与文件目录配置
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));
app.use('/files', express.static(path.join(__dirname, 'files')));

const FILES_DIR = path.join(__dirname, 'files');

// 确保项目目录存在
const projects = ['IronMastiff', 'ShadowMastiff', 'WarriorMastiff'];
const subFolders = ['product', 'protocol', 'software', 'development', 'usage', 'video'];

projects.forEach(project => {
    subFolders.forEach(folder => {
        const dirPath = path.join(FILES_DIR, project, folder);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });
});

const categoryMap = {
    'product': '产品介绍文件',
    'protocol': '协议',
    'software': '开发软件下载',
    'development': '开发文件',
    'usage': '产品使用',
    'video': '视频教程'
};

// ==========================================
// 2. API 接口配置
// ==========================================

// 接口 1：获取所有文件列表（全局）
app.get('/api/files', (req, res) => {
    try {
        const { folder } = req.query;

        if (!folder) {
            let allFiles = [];
            if (fs.existsSync(FILES_DIR)) {
                const projects = fs.readdirSync(FILES_DIR).filter(item => 
                    fs.statSync(path.join(FILES_DIR, item)).isDirectory()
                );
                projects.forEach(projectName => {
                    const projectPath = path.join(FILES_DIR, projectName);
                    const folders = fs.readdirSync(projectPath).filter(item => 
                        fs.statSync(path.join(projectPath, item)).isDirectory()
                    );
                    folders.forEach(folderName => {
                        const folderPath = path.join(projectPath, folderName);
                        const files = fs.readdirSync(folderPath);
                        const categoryName = categoryMap[folderName] || folderName;
                        files.forEach(filename => {
                            const filePath = path.join(folderPath, filename);
                            try {
                                const stats = fs.statSync(filePath);
                                if (stats.isFile()) {
                                    allFiles.push({
                                        title: filename,
                                        file_path: `/files/${projectName}/${folderName}/${filename}`,
                                        size: (stats.size / 1024).toFixed(2) + ' KB',
                                        ext: path.extname(filename).toLowerCase(),
                                        category: categoryName,
                                        folder: folderName,
                                        project: projectName
                                    });
                                }
                            } catch (e) {
                                /* 跳过无法读取的文件 */
                            }
                        });
                    });
                });
            }
            return res.json({ success: true, data: allFiles });
        }

        // 指定文件夹（兼容旧接口）
        const folderPath = path.join(FILES_DIR, folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            return res.json({ success: true, data: [] });
        }
        const files = fs.readdirSync(folderPath);
        const fileList = files.map(filename => {
            const filePath = path.join(folderPath, filename);
            try {
                const stats = fs.statSync(filePath);
                if (stats.isFile()) {
                    return {
                        title: filename,
                        file_path: `/files/${folder}/${filename}`,
                        size: (stats.size / 1024).toFixed(2) + ' KB',
                        ext: path.extname(filename).toLowerCase(),
                        category: categoryMap[folder] || folder,
                        folder: folder
                    };
                }
            } catch (e) {
                console.error(e);
            }
            return null;
        }).filter(item => item !== null);
        res.json({ success: true, data: fileList });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取文件列表失败' });
    }
});

// 接口 2：全局搜索
app.get('/api/search-all', (req, res) => {
    try {
        const { q } = req.query;
        let allFiles = [];

        if (fs.existsSync(FILES_DIR)) {
            const projects = fs.readdirSync(FILES_DIR).filter(item => 
                fs.statSync(path.join(FILES_DIR, item)).isDirectory()
            );
            projects.forEach(projectName => {
                const projectPath = path.join(FILES_DIR, projectName);
                if (!fs.existsSync(projectPath)) return;
                
                const folders = fs.readdirSync(projectPath).filter(item => 
                    fs.statSync(path.join(projectPath, item)).isDirectory()
                );
                folders.forEach(folderName => {
                    const folderPath = path.join(projectPath, folderName);
                    if (!fs.existsSync(folderPath)) return;
                    
                    const files = fs.readdirSync(folderPath);
                    const categoryName = categoryMap[folderName] || folderName;
                    files.forEach(filename => {
                        const filePath = path.join(folderPath, filename);
                        try {
                            const stats = fs.statSync(filePath);
                            if (stats.isFile()) {
                                allFiles.push({
                                    title: filename,
                                    file_path: `/files/${projectName}/${folderName}/${filename}`,
                                    size: (stats.size / 1024).toFixed(2) + ' KB',
                                    ext: path.extname(filename).toLowerCase(),
                                    category: categoryName,
                                    folder: folderName,
                                    project: projectName
                                });
                            }
                        } catch (e) {
                            /* 跳过无法读取的文件 */
                        }
                    });
                });
            });
        }

        if (q && q.trim() !== '') {
            const searchTerm = q.trim().toLowerCase();
            allFiles = allFiles.filter(file => 
                file.title.toLowerCase().includes(searchTerm) || 
                file.category.toLowerCase().includes(searchTerm) || 
                file.ext.toLowerCase().includes(searchTerm) || 
                file.folder.toLowerCase().includes(searchTerm) ||
                file.project.toLowerCase().includes(searchTerm)
            );
        }

        res.json({ success: true, data: allFiles });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, message: '全局搜索失败', data: [] });
    }
});

// ==========================================
// 3. 新增：项目专用接口
// ==========================================

// 接口 3：获取指定项目的文件列表
app.get('/api/project-files', (req, res) => {
    try {
        const { project } = req.query;
        if (!project) {
            return res.status(400).json({ 
                success: false, 
                message: '缺少项目参数' 
            });
        }

        const safeProject = path.basename(project);
        const projectPath = path.join(FILES_DIR, safeProject);
        
        if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath, { recursive: true });
            return res.json({ success: true, data: [] });
        }

        let allFiles = [];
        const folders = fs.readdirSync(projectPath).filter(item => 
            fs.statSync(path.join(projectPath, item)).isDirectory()
        );

        folders.forEach(folderName => {
            const folderPath = path.join(projectPath, folderName);
            const files = fs.readdirSync(folderPath);
            const categoryName = categoryMap[folderName] || folderName;
            
            files.forEach(filename => {
                const filePath = path.join(folderPath, filename);
                try {
                    const stats = fs.statSync(filePath);
                    if (stats.isFile()) {
                        allFiles.push({
                            title: filename,
                            file_path: `/files/${safeProject}/${folderName}/${filename}`,
                            size: (stats.size / 1024).toFixed(2) + ' KB',
                            ext: path.extname(filename).toLowerCase(),
                            category: categoryName,
                            folder: folderName,
                            project: safeProject
                        });
                    }
                } catch (e) {
                    /* 跳过无法读取的文件 */
                }
            });
        });

        res.json({ success: true, data: allFiles });
    } catch (error) {
        console.error('获取项目文件失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取项目文件列表失败',
            data: [] 
        });
    }
});

// 接口 4：项目内搜索
app.get('/api/project-search', (req, res) => {
    try {
        const { q, project } = req.query;
        if (!project) {
            return res.status(400).json({ 
                success: false, 
                message: '缺少项目参数' 
            });
        }

        const safeProject = path.basename(project);
        const projectPath = path.join(FILES_DIR, safeProject);
        
        if (!fs.existsSync(projectPath)) {
            return res.json({ success: true, data: [] });
        }

        let allFiles = [];
        const folders = fs.readdirSync(projectPath).filter(item => 
            fs.statSync(path.join(projectPath, item)).isDirectory()
        );

        folders.forEach(folderName => {
            const folderPath = path.join(projectPath, folderName);
            const files = fs.readdirSync(folderPath);
            const categoryName = categoryMap[folderName] || folderName;
            
            files.forEach(filename => {
                const filePath = path.join(folderPath, filename);
                try {
                    const stats = fs.statSync(filePath);
                    if (stats.isFile()) {
                        allFiles.push({
                            title: filename,
                            file_path: `/files/${safeProject}/${folderName}/${filename}`,
                            size: (stats.size / 1024).toFixed(2) + ' KB',
                            ext: path.extname(filename).toLowerCase(),
                            category: categoryName,
                            folder: folderName,
                            project: safeProject
                        });
                    }
                } catch (e) {
                    /* 跳过无法读取的文件 */
                }
            });
        });

        if (q && q.trim() !== '') {
            const searchTerm = q.trim().toLowerCase();
            allFiles = allFiles.filter(file => 
                file.title.toLowerCase().includes(searchTerm) || 
                file.category.toLowerCase().includes(searchTerm) || 
                file.ext.toLowerCase().includes(searchTerm) || 
                file.folder.toLowerCase().includes(searchTerm)
            );
        }

        res.json({ success: true, data: allFiles });
    } catch (error) {
        console.error('项目搜索失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '项目搜索失败',
            data: [] 
        });
    }
});

// 接口 5：在线预览
app.get('/api/preview', (req, res) => {
    const { folder, filename } = req.query;
    if (!folder || !filename) {
        return res.status(400).send('Error: Missing parameters');
    }
    const safeFolder = path.basename(folder);
    const safeFilename = path.basename(filename);
    const filePath = path.join(FILES_DIR, safeFolder, safeFilename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Error: File not found');
    }

    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.txt') contentType = 'text/plain';
    else if (ext === '.html') contentType = 'text/html';
    else if (ext === '.mp4') contentType = 'video/mp4';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(safeFilename)}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    console.log(`[Preview] Serving: ${safeFilename} (Type: ${contentType})`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
        console.error('Preview stream error:', err);
        if (!res.headersSent) res.status(500).send('Error reading file');
    });
    fileStream.pipe(res);
});

// 接口 6：文件下载
app.get('/api/download', (req, res) => {
    const { folder, filename } = req.query;
    if (!folder || !filename) return res.status(400).send('Error: Missing parameters');

    const safeFolder = path.basename(folder);
    const safeFilename = path.basename(filename);
    const filePath = path.join(FILES_DIR, safeFolder, safeFilename);

    if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"`);
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Type', 'application/octet-stream');

        const fileStream = fs.createReadStream(filePath);
        fileStream.on('error', (err) => {
            console.error('Download stream error:', err);
            if (!res.headersSent) res.status(500).send('文件读取失败');
        });
        fileStream.pipe(res);
    } else {
        res.status(404).send('Error: File not found');
    }
    
});

// ==========================================
// 4. 启动服务器
// ==========================================
app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    console.log(' 产品文档与资源中心 - 服务器已启动');
    console.log('========================================');
    console.log(` 访问地址: http://localhost:${PORT}`);
    console.log(` 文件目录: ${FILES_DIR}`);
    console.log('========================================');
    console.log('');
});