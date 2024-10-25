document.addEventListener('DOMContentLoaded', function() {
    // 文件上传预览
    const fileInput = document.getElementById('file-input');
    const previewArea = document.getElementById('preview-area');
    const uploadBtn = document.getElementById('upload-btn');
    const reuploadBtn = document.getElementById('reupload-btn');

    fileInput.addEventListener('change', function(e) {
        previewArea.innerHTML = '';
        const files = e.target.files;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')){ continue }
            const imgContainer = document.createElement('div');
            imgContainer.classList.add('preview-container');
            const img = document.createElement('img');
            img.classList.add('preview-image');
            img.file = file;
            imgContainer.appendChild(img);
            previewArea.appendChild(imgContainer);

            const reader = new FileReader();
            reader.onload = (function(aImg) { 
                return function(e) { 
                    aImg.src = e.target.result; 
                }; 
            })(img);
            reader.readAsDataURL(file);
        }
        // 显示上传和重新上传按钮
        uploadBtn.style.display = 'inline-block';
        reuploadBtn.style.display = 'inline-block';
    });

    // 上传图片
    uploadBtn.addEventListener('click', function() {
        // 这里应该添加实际的上传逻辑
        alert('图片上传功能尚未实现');
    });

    // 重新上传
    reuploadBtn.addEventListener('click', function() {
        fileInput.value = ''; // 清空文件输入
        previewArea.innerHTML = ''; // 清空预览区域
        uploadBtn.style.display = 'none'; // 隐藏上传按钮
        reuploadBtn.style.display = 'none'; // 隐藏重新上传按钮
        
        // 清除处理结果
        const resultImage = document.getElementById('result-image');
        resultImage.innerHTML = ''; // 清空结果图像区域
        document.getElementById('download-buttons').style.display = 'none'; // 隐藏下载按钮
        processStatus.textContent = ''; // 清除处理状态信息
        
        // 重置处理选项
        document.getElementById('process-form').reset();
    });

    // 添加下载功能
    const downloadImageBtn = document.getElementById('download-image');
    const downloadHistogramBtn = document.getElementById('download-histogram');

    downloadImageBtn.addEventListener('click', function() {
        // 这里应该是处理后的图像URL
        const imageUrl = document.querySelector('#result-image img').src;
        downloadImage(imageUrl, 'processed_image.png');
    });

    downloadHistogramBtn.addEventListener('click', function() {
        // 这里应该是生成的直方图URL
        const histogramUrl = document.querySelector('#result-image canvas').toDataURL('image/png');
        downloadImage(histogramUrl, 'histogram.png');
    });

    function downloadImage(url, filename) {
        fetch(url)
            .then(response => response.blob())
            .then(blob => {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(error => {
                console.error('Download failed:', error);
                alert('下载失败，请重试');
            });
    }

    // 处理表单提交
    const processForm = document.getElementById('process-form');
    const processStatus = document.getElementById('process-status');

    processForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(processForm);
        const options = {
            grayscale: formData.get('process') === 'grayscale',
            histogram: formData.get('histogram') === 'on',
            spatial: formData.get('spatial') === 'on',
            kernelSize: parseInt(formData.get('kernel-size')) || 3
        };
        
        if (options.grayscale || options.histogram || options.spatial) {
            processStatus.textContent = '正在处理...';
            const previewImage = document.querySelector('.preview-image');
            if (previewImage) {
                const results = processImage(previewImage, options);
                displayResults(results.processedImage, options.histogram ? drawHistogram(results.histogram) : null);
                processStatus.textContent = '处理完成！';
            } else {
                alert('请先上传图片');
            }
        } else {
            processStatus.textContent = '请选择至少一个处理选项';
        }
    });

    // 初始化时隐藏上传和重新上传按钮
    uploadBtn.style.display = 'none';
    reuploadBtn.style.display = 'none';
});

// 在处理完成后添加这段代码
function displayResults(processedImageUrl, histogramUrl) {
    const resultImage = document.getElementById('result-image');
    resultImage.innerHTML = ''; // 清空之前的结果

    // 添加处理后的图像
    const img = document.createElement('img');
    img.src = processedImageUrl;
    resultImage.appendChild(img);

    // 如果生成了直方图，添加直方图
    if (histogramUrl) {
        const histogramImg = document.createElement('img');
        histogramImg.src = histogramUrl;
        resultImage.appendChild(histogramImg);
    }

    // 显示下载按钮
    document.getElementById('download-buttons').style.display = 'block';
}

// 图像处理函数
function processImage(imageElement, options) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    if (options.grayscale) {
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
        }
    }

    if (options.spatial) {
        // 简单的空间域增强（锐化）
        const kernelSize = options.kernelSize || 3;
        const sharpenKernel = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ];
        applyConvolution(imageData, sharpenKernel);
    }

    ctx.putImageData(imageData, 0, 0);
    return {
        processedImage: canvas.toDataURL(),
        histogram: options.histogram ? drawHistogram(generateHistogram(data)) : null
    };
}

function applyConvolution(imageData, kernel) {
    const side = Math.round(Math.sqrt(kernel.length));
    const halfSide = Math.floor(side / 2);
    const src = imageData.data;
    const sw = imageData.width;
    const sh = imageData.height;
    const w = sw;
    const h = sh;
    const dst = new Uint8ClampedArray(w * h * 4);
    const alphaFac = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const sy = y;
            const sx = x;
            const dstOff = (y * w + x) * 4;
            let r = 0, g = 0, b = 0, a = 0;
            for (let cy = 0; cy < side; cy++) {
                for (let cx = 0; cx < side; cx++) {
                    const scy = sy + cy - halfSide;
                    const scx = sx + cx - halfSide;
                    if (scy >= 0 && scy < sh && scx >= 0 && scx < sw) {
                        const srcOff = (scy * sw + scx) * 4;
                        const wt = kernel[cy][cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                        a += src[srcOff + 3] * wt;
                    }
                }
            }
            dst[dstOff] = r;
            dst[dstOff + 1] = g;
            dst[dstOff + 2] = b;
            dst[dstOff + 3] = a + alphaFac * (255 - a);
        }
    }
    imageData.data.set(dst);
}

function generateHistogram(data) {
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
        const avg = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
        histogram[avg]++;
    }
    return histogram;
}

function drawHistogram(histogram) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 200;  // 增加高度以便更好地可视化
    const ctx = canvas.getContext('2d');
    const max = Math.max(...histogram);
    
    // 绘制白色背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制直方图
    ctx.fillStyle = 'black';
    for (let i = 0; i < histogram.length; i++) {
        const height = (histogram[i] / max) * canvas.height;
        ctx.fillRect(i, canvas.height - height, 1, height);
    }
    
    // 绘制坐标轴
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.stroke();
    
    return canvas.toDataURL();
}