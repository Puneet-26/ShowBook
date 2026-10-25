const theatreService = require('../services/theatre.service');

class TheatreController {
  async getTheatres(req, res, next) {
    try {
      const theatres = await theatreService.listTheatres();
      res.status(200).json({
        success: true,
        count: theatres.length,
        data: { theatres },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTheatreById(req, res, next) {
    try {
      const theatre = await theatreService.getTheatreById(req.params.id);
      res.status(200).json({
        success: true,
        data: { theatre },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TheatreController();
