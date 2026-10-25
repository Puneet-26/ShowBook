const showService = require('../services/show.service');

class ShowController {
  async getShows(req, res, next) {
    try {
      const { movieId, theatreId, date } = req.query;
      const shows = await showService.listShows({ movieId, theatreId, date });
      res.status(200).json({
        success: true,
        count: shows.length,
        data: { shows },
      });
    } catch (error) {
      next(error);
    }
  }

  async getShowById(req, res, next) {
    try {
      const show = await showService.getShowById(req.params.id);
      res.status(200).json({
        success: true,
        data: { show },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ShowController();
