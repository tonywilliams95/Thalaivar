const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('thalaivar', {
  onRemind: (fn) => ipcRenderer.on('remind', (_e, data) => fn(data)),
  onCount: (fn) => ipcRenderer.on('count', (_e, data) => fn(data)),
  answer: (value) => ipcRenderer.send('answer', value),
  interactive: (on) => ipcRenderer.send('interactive', on),
  done: () => ipcRenderer.send('done'),
});
