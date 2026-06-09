import Analytics from '../models/Analytics.js';

export const getAnalytics = async (req, res) => {
  try {
    const brandId = req.brand._id;

    // Total views
    const totalViews = await Analytics.countDocuments({
      brandId,
      event: 'view',
    });

    // Total color changes
    const totalColorChanges = await Analytics.countDocuments({
      brandId,
      event: 'color_change',
    });

    // Most popular variant
    const popularVariants = await Analytics.aggregate([
      { $match: { brandId, event: 'color_change', variantSelected: { $ne: null } } },
      { $group: { _id: '$variantSelected', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Last 7 days views
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyViews = await Analytics.aggregate([
      {
        $match: {
          brandId,
          event: 'view',
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      totalViews,
      totalColorChanges,
      popularVariants,
      dailyViews,
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};