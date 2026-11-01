const fs=require('node:fs');
const path=require('node:path');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
(async()=>{
 const directory=path.join(__dirname,'../icons');
 const svg=await loadImage(fs.readFileSync(path.join(directory,'logo.svg')));
 for(const size of [16,32,48,128,256,512]){
  const canvas=createCanvas(size,size);canvas.getContext('2d').drawImage(svg,0,0,size,size);
  fs.writeFileSync(path.join(directory,`icon-${size}.png`),canvas.toBuffer('image/png'));
 }
})();
