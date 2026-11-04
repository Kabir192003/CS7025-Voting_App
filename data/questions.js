/**
 * Curated seed decisions: [title, context, THIS, THAT, expected share for THIS (0-100), optional [argument for THIS, argument for THAT]].
 * Writing rules: name the real trade-off, include one concrete constraint (budget, time, place),
 * keep each option under 28 characters, avoid questions with an obvious right answer.
 */
module.exports = {
  Tech: [
    ['MacBook Air M4 or ThinkPad X1 Carbon for a design + dev master’s?', '€1,300 budget. I carry it across campus daily and need Figma, Docker and the odd Blender render.', 'MacBook Air M4', 'ThinkPad X1 Carbon', 57, ['Battery life and the trackpad matter more than ports when you move all day.', 'Linux and a proper keyboard, and you can upgrade the RAM later.']],
    ['Keychron Q1 or stick with the laptop keyboard for thesis writing?', 'About 20,000 words over three months. Shared flat, so noise is a factor.', 'Keychron Q1', 'Laptop keyboard', 41],
    ['iPhone 16 or Pixel 9 as a first phone I’ll keep for five years?', 'I never change phones. Mostly photos, maps and banking apps.', 'iPhone 16', 'Pixel 9', 52],
    ['Self-host a home server, or pay for cloud storage?', 'About 2 TB of photos and documents. I’m comfortable with Linux but busy.', 'Self-host it', 'Pay for cloud', 38],
    ['Learn Rust or deepen TypeScript for the next job search?', 'Graduating in June. Targeting product teams in Dublin.', 'Learn Rust', 'Deepen TypeScript', 24]
  ],
  Money: [
    ['Clear a €4k credit union loan first, or start investing €200 a month now?', 'The loan is at 7.5% APR with 22 months left. Three months of rent saved, no other debt.', 'Clear the loan', 'Start investing', 79, ['7.5% guaranteed beats what you can count on from an index fund after tax.', 'Time in the market matters. Even €50 now builds the habit while the loan runs.']],
    ['Credit card for the travel points, or debit only?', 'I pay off in full every month. Flying home to Dublin about four times a year.', 'Credit card', 'Debit only', 46],
    ['Buy a used car for €6k, or keep paying €90 a month for a bike and Leap card?', 'Live in Dublin, work hybrid. A car would mostly be for weekends.', 'Buy the car', 'Keep it simple', 29],
    ['Pay €300 more rent for a place near work, or commute 50 minutes and save?', 'Both rooms are fine. The long one has a garden.', 'Pay for proximity', 'Commute and save', 44],
    ['Emergency fund first, or max out the employer pension match?', 'Employer matches up to 5%. I have one month of expenses saved.', 'Emergency fund', 'Pension match', 36]
  ],
  Career: [
    ['Fully remote startup, or a hybrid big-firm role paying €6k more?', 'First job after the MSc. The startup gives ownership; the big firm has a structured grad programme.', 'Remote startup', 'Hybrid big firm', 51, ['Real ownership at 23 compounds faster than a grad scheme.', 'Mentors, a brand on your CV and a safety net while you learn.']],
    ['Take the promotion into management, or stay a senior engineer?', 'Offered a team of five. I like coding but I’m good at unblocking people.', 'Go into management', 'Stay a senior IC', 40],
    ['Ask for a raise now, or wait for the annual review in four months?', 'I took on a colleague’s workload in September. No raise since joining.', 'Ask now', 'Wait for the review', 68],
    ['A master’s in AI, or two more years of work experience?', 'I have a BSc and one year at a bank. Fees would be about €12k.', 'Do the master’s', 'Keep working', 47],
    ['Say yes to a counter-offer, or take the new job anyway?', 'Current employer matched the salary after I resigned. The new role is more interesting.', 'Accept the counter', 'Take the new job', 31]
  ],
  Study: [
    ['Berkeley Library or the Hamilton for exam season?', 'I focus better with a little background noise but get distracted by people.', 'Berkeley', 'Hamilton', 31],
    ['Revise alone, or with a study group the night before?', 'It’s a statistics exam. I get stuck on proofs and explain things well.', 'Alone', 'Study group', 35],
    ['Handwrite notes, or type them in the lecture?', 'Dense theory modules. I type fast but forget what I typed.', 'Handwrite', 'Type', 53],
    ['Start the dissertation now, or finish the taught modules first?', 'Deadline is August. Two modules left, both with exams in April.', 'Start the dissertation', 'Finish modules first', 28],
    ['Past papers first, or re-read the lecture notes?', 'Four weeks until the exam. The lecturer reuses question styles.', 'Past papers first', 'Re-read the notes', 74]
  ],
  Travel: [
    ['Lisbon or Porto for a first long weekend in Portugal?', 'Three nights in March, flying from Dublin. Into food and walking, not nightclubs.', 'Lisbon', 'Porto', 48, ['Tram 28 and the miradouros are unbeatable.', 'Cheaper, smaller and the river at night is gorgeous.']],
    ['Interrailing for three weeks, or one place for a month?', 'First summer after finals. Budget is about €2,000.', 'Interrail', 'One place', 61],
    ['Window or aisle on a seven-hour flight?', 'I sleep badly on planes and drink a lot of water.', 'Window', 'Aisle', 44],
    ['Book a package holiday, or plan everything yourself?', 'Four people, one week in Spain in June. Nobody wants to organise.', 'Package holiday', 'DIY trip', 33],
    ['Japan in spring, or Japan in autumn?', 'Two weeks, first time. Cherry blossoms against the leaves.', 'Spring', 'Autumn', 56]
  ],
  'Food & Drink': [
    ['Meal-prep on Sunday, or cook fresh every night?', 'Working nine to five, eating at home. I like cooking but hate Sunday afternoons lost.', 'Meal-prep', 'Cook fresh', 54],
    ['Flat white or oat cortado as the default order?', 'Trying to find one coffee I’ll order forever.', 'Flat white', 'Oat cortado', 58],
    ['Pizza dough from scratch, or good shop-bought?', 'Making dinner for six on Saturday. I’ve done the dough twice with mixed results.', 'From scratch', 'Shop-bought', 37],
    ['Buy a €400 espresso machine, or keep buying coffee for €4.20?', 'Two coffees a day, five days a week.', 'Buy the machine', 'Keep buying', 62],
    ['Eat out once a week, or save it for a big dinner each month?', 'Same total budget either way.', 'Little and often', 'One big night', 49]
  ],
  Home: [
    ['Rent alone in Rathmines, or share in Phibsborough and save €450?', 'Working from home three days a week. I like my own space.', 'Live alone', 'House-share', 45],
    ['Get a cat, or wait until I’m out of rented flats?', 'Landlord allows pets. Out of the flat 9 to 6.', 'Get a cat', 'Wait', 59],
    ['Buy a cheap bed frame now, or save for a proper one?', 'Moving flats again within a year. Current mattress is on the floor.', 'Buy cheap now', 'Save for a good one', 43],
    ['Paint the walls or leave them and hang art?', 'The landlord says paint is fine if I repaint when I leave.', 'Paint them', 'Hang art', 38],
    ['Heat pump or keep the oil boiler for another ten years?', 'Old house, boiler is 15 years old. Grant covers about a third.', 'Heat pump', 'Keep the boiler', 64]
  ],
  Health: [
    ['Gym at 7am or 7pm when you’re new to it?', 'Work starts at 9:30. I’m not a morning person but evenings fill up.', '7am', '7pm', 41],
    ['Run outside, or use the treadmill through a Dublin winter?', 'Training for a 10k in March, three runs a week.', 'Run outside', 'Treadmill', 55],
    ['Sleep in on the weekend, or keep the weekday alarm?', 'Weekdays are 6:45. Weekends I could sleep until 10.', 'Sleep in', 'Keep the alarm', 47],
    ['Track calories, or just eat more protein and fewer snacks?', 'Trying to lose 5 kg without making food stressful.', 'Track calories', 'Simple rules', 30],
    ['Physio now for a sore knee, or rest and see?', 'Started after a half marathon. Hurts on stairs, fine on flat.', 'See a physio', 'Rest and see', 66]
  ],
  Style: [
    ['One good wool coat, or two cheaper jackets for a Dublin winter?', 'Budget €250. It rains most weeks and I walk to work.', 'One good coat', 'Two jackets', 52],
    ['White trainers or black boots for everyday wear?', 'Smart casual office, lots of walking, no dress code.', 'White trainers', 'Black boots', 57],
    ['Buy secondhand for most clothes, or buy new and wear longer?', 'About €80 a month on clothes. I hate shopping.', 'Mostly secondhand', 'Buy new, wear long', 63],
    ['Grow a beard, or stay clean-shaven?', 'Starting a client-facing job in January. Hair grows in patchy.', 'Grow it', 'Stay shaved', 34],
    ['Bleach my hair, or leave it natural?', 'Dark brown, 22, work in an office that doesn’t mind.', 'Go bleach', 'Stay natural', 46]
  ],
  Relationships: [
    ['Tell a friend you can’t afford the group holiday, or quietly find the money?', 'It’s €900 and the first time all six of us are free. I’d be on a tight budget for months.', 'Tell them', 'Find the money', 69],
    ['Text back now, or let it sit until tomorrow?', 'A friend I haven’t spoken to in a year just messaged. I feel awkward.', 'Reply now', 'Reply tomorrow', 74],
    ['Move in together after six months, or wait a year?', 'Both our leases end in the summer. Everything is going well.', 'Move in', 'Wait', 38],
    ['Go to the wedding of a friend I’ve drifted from?', 'Abroad, €400 for flights, I wasn’t in the wedding party.', 'Go', 'Politely decline', 57],
    ['Long-distance for a year, or break up before they move abroad?', 'Dublin to Toronto. We’re both 25 and committed.', 'Try long-distance', 'End it kindly', 42]
  ],
  Entertainment: [
    ['Read Normal People first, or watch the series first?', 'I have a week off and somehow avoided both.', 'Book first', 'Series first', 50],
    ['Cinema on opening weekend, or wait for streaming?', 'Big sci-fi film. Cinema is €14 a ticket in the city centre.', 'Go to the cinema', 'Wait for streaming', 45],
    ['Buy a PS5 or build a gaming PC?', '€700 budget. I play a mix of single-player games and Rocket League.', 'PS5', 'Gaming PC', 48],
    ['Concert in the Aviva, or three club gigs for the same money?', 'The stadium show is €95. The clubs are €30 each.', 'The big concert', 'Three small gigs', 36],
    ['Watch a series weekly as it airs, or wait and binge?', 'Everyone on my team talks about it every Monday.', 'Weekly', 'Binge', 52]
  ],
  Everyday: [
    ['Luas or cycle to campus through a Dublin winter?', '25 minutes on the bike, 35 door to door on the Luas. It rains a lot.', 'Luas', 'Cycle', 44],
    ['Shower in the morning or at night?', 'I run hot and cold on this one. Hair takes forever to dry.', 'Morning', 'Night', 58],
    ['Do the dishes straight away, or leave them until after dinner?', 'Flatmates are split down the middle.', 'Straight away', 'Later', 60],
    ['Walk to the shop, or order the grocery delivery?', 'Delivery is €5. Shop is 12 minutes away. I forget things.', 'Walk to the shop', 'Order delivery', 53],
    ['Alarm on the other side of the room, or phone next to the bed?', 'I hit snooze three times every morning.', 'Alarm across the room', 'Phone by the bed', 70]
  ]
}
