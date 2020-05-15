const debug = require('debug');

const db = require('../models');
const { downloadDrawing } = require('../drawingStore');

// const log = debug('warhol:lib:Drawing');
const logError = debug('warhol:lib:Drawing:error');

async function getDrawingsForGame(gameHash) {
  try {
    const drawings = await db.Drawing.model.find({ gameHash });
    if (!drawings) throw new Error('Error getting drawings from db');
    const drawingsMap = {};
    const promises = [];
    drawings.forEach(drawing => {
      if (drawing.cloudFileName) {
        promises.push(downloadDrawing(drawing.cloudFileName).then(drawData => {
          drawingsMap[drawing._id] = drawData;
        }));
      }
    });
    await Promise.all(promises);
    return drawingsMap;
  } catch (err) {
    logError(err);
    throw new Error('Failed to get drawings');
  }
}

module.exports = {
  getDrawingsForGame,
};
