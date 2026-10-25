const movieService = require('../services/movie.service');

class MovieController {
  async getMovies(req, res, next) {
    try {
      const { search, genre, language, status } = req.query;
      const movies = await movieService.listMovies({ search, genre, language, status });
      res.status(200).json({
        success: true,
        count: movies.length,
        data: { movies },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMovieById(req, res, next) {
    try {
      const movie = await movieService.getMovieById(req.params.id);
      res.status(200).json({
        success: true,
        data: { movie },
      });
    } catch (error) {
      next(error);
    }
  }

  async getFilters(req, res, next) {
    try {
      const filters = await movieService.getFilterOptions();
      res.status(200).json({
        success: true,
        data: { filters },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MovieController();
