/** Rules that the feed, poll page, notifications and tests must all agree on. */
module.exports = Object.freeze({
  MIN_VOTES_TO_CALL: 10,       // below this, "Too early to call"
  CLOSE_MARGIN_PTS: 6,         // margin at or under this, "Too close to call"
  LANDSLIDE_PCT: 70,           // leader at or above this, "Landslide"
  MAX_ARGUMENTS_PER_USER: 5,
  REPORT_HIDE_THRESHOLD: 5,    // distinct reporters before content is hidden
  DURATIONS_HOURS: [6, 24, 72, 168],
  TOPICS: [
    'Tech', 'Money', 'Career', 'Study', 'Travel', 'Food & Drink',
    'Home', 'Health', 'Style', 'Relationships', 'Entertainment', 'Everyday'
  ],
  GENDERS: ['Female', 'Male', 'Non-binary', 'Prefer not to say'],
  REPORT_REASONS: ['spam', 'abuse', 'misleading', 'other'],
  PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 30
})
