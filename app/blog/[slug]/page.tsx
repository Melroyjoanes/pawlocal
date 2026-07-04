import Link from 'next/link'
import { notFound } from 'next/navigation'

type BlogPost = {
  slug: string
  category: string
  categoryColor: string
  categoryText: string
  image: string
  title: string
  date: string
  readTime: string
  author: string
  content: React.ReactNode
}

const POSTS: BlogPost[] = [
  {
    slug: 'how-to-choose-dog-walker-mumbai',
    category: 'Dog Walking',
    categoryColor: '#FEF3C7',
    categoryText: '#78350F',
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
    title: 'How to choose the right dog walker in Mumbai',
    date: 'Jun 10, 2026',
    readTime: '5 min read',
    author: 'PupStep Team',
    content: (
      <>
        <p>Finding a dog walker in Mumbai feels easy until something goes wrong. A missed walk, a dog let off-leash near traffic, no photo to show your dog made it home safely. These aren&apos;t rare horror stories — they&apos;re what happens when you hire without a proper vetting process.</p>
        <p>Here&apos;s everything you need to know before handing your keys to anyone in Juhu, Versova, Andheri West or Santacruz West.</p>

        <h2>1. Ask about their daily capacity — not just availability</h2>
        <p>A good walker in a residential building society can handle 4–6 dogs a day comfortably. Beyond that, walks get rushed and attention drops. When you speak to a walker, ask how many dogs they currently walk. If the number is above 8, ask how they structure their day. Red flag: if they can&apos;t give you a clear answer, they&apos;re probably running dogs back to back with no buffer time.</p>
        <p>In Juhu specifically, morning slots between 6–8 am fill up fast. If a walker says they can squeeze you in at 7:30 am and already have 4 other dogs in that window, your dog is getting a rushed 10-minute outing, not a proper walk.</p>

        <h2>2. Always ask for a care report from a recent client</h2>
        <p>Serious walkers send care reports after every walk — a photo, a route map, notes on your dog&apos;s mood, bathroom habits. Ask to see a sample report from a recent walk (with the other pet parent&apos;s permission). If they don&apos;t send reports at all, that&apos;s a red flag. You have no way of knowing what actually happened during the 45 minutes your dog was out.</p>
        <p>Care reports aren&apos;t just peace of mind. They&apos;re a health log. A good walker will notice that your Labrador&apos;s poop changed consistency three days in a row before you would. That&apos;s caught early — before a vet visit turns into an overnight stay.</p>

        <h2>3. Do a meet-and-greet before the first paid walk</h2>
        <p>Any walker worth hiring will agree to a free meet-and-greet. This is 15–20 minutes where you watch how they interact with your dog. Things to observe:</p>
        <ul>
          <li>Do they let your dog approach them, or do they rush in with pets and cuddles immediately?</li>
          <li>Do they crouch to the dog&apos;s level or loom over them?</li>
          <li>Do they watch the dog&apos;s body language or talk to you the entire time?</li>
          <li>Can they read when your dog is nervous versus excited?</li>
        </ul>
        <p>Dogs can&apos;t tell you if they were uncomfortable. This 20 minutes is the only real read you get on whether the fit is right.</p>

        <h2>4. Check their route for safety hazards</h2>
        <p>This matters a lot more in Mumbai than in quieter cities. Ask which routes they typically take for dogs in your building. Stretches near Juhu Chowpatty, the Versova fishing village side streets, and parts of Andheri West near the station have traffic that&apos;s genuinely dangerous for a dog on a leash. A good walker knows which roads to avoid and can explain why.</p>
        <p>Also ask: do they use a slip lead or a harness? For dogs that pull, a harness is significantly safer. If a walker insists on a choke chain or slip lead for a dog that already wears a harness, ask why.</p>

        <h2>5. Confirm what happens if your dog gets sick mid-walk</h2>
        <p>This question separates experienced walkers from opportunists. Ask them directly: &quot;If my dog vomits or seems lethargic during a walk, what do you do?&quot; The right answer involves calling you immediately, cutting the walk short, and sitting with the dog until you or someone you designate can reach them. The wrong answer is vague or defensive.</p>
        <p>Also confirm: do they know your vet&apos;s number? Do they have it saved? Will they carry your dog&apos;s vaccination card on the first walk if you provide it?</p>

        <h2>Red flags at a glance</h2>
        <ul>
          <li>No care reports, no photos, no communication unless you ask</li>
          <li>Can&apos;t name the specific route they&apos;d take for your dog</li>
          <li>Walks more than 8–10 dogs per day solo</li>
          <li>Refuses or avoids a meet-and-greet</li>
          <li>Off-leash walking in an unfenced area without explicit owner permission</li>
          <li>No clear answer for what to do in an emergency</li>
        </ul>

        <h2>How PupStep verifies walkers in Mumbai</h2>
        <p>Every walker listed on PupStep goes through a manual review before getting a verified badge. We confirm their ID, check references from existing clients, and review their care report samples. We also do periodic spot-checks where we ask listed walkers to send a sample report from a real walk (names and details removed) so we know the quality is maintained.</p>
        <p>If a walker on PupStep gets a complaint, we investigate — and if it&apos;s a serious issue, they&apos;re removed. It&apos;s not perfect, but it&apos;s far better than a Facebook group recommendation.</p>

        <p className="text-sm text-slate-400 mt-8 pt-6 border-t border-slate-100">Have a question about finding a walker in your area? WhatsApp us at <a href="https://wa.me/919892620677" className="underline text-amber-700">+91 98926 20677</a> and we&apos;ll help personally.</p>
      </>
    ),
  },
  {
    slug: 'what-is-a-care-report',
    category: 'Care Reports',
    categoryColor: '#F0FDF4',
    categoryText: '#064E3B',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=1200&q=80',
    title: 'What is a care report and why your vet will love it',
    date: 'Jun 5, 2026',
    readTime: '4 min read',
    author: 'PupStep Team',
    content: (
      <>
        <p>Most pet parents in India describe their dog&apos;s symptoms to a vet from memory. &quot;He seemed a little off this week.&quot; &quot;She&apos;s been drinking more water, I think.&quot; Vets want data — and care reports are one of the most useful data sources they rarely get to see.</p>

        <h2>What a care report actually contains</h2>
        <p>A care report is a structured summary sent by your dog walker or groomer after every session. On PupStep, walkers send reports that include:</p>
        <ul>
          <li><strong>GPS route:</strong> The exact path walked, distance, and duration</li>
          <li><strong>Bathroom log:</strong> Whether your dog peed and pooped, how many times, and whether anything looked unusual</li>
          <li><strong>Mood and energy:</strong> Was your dog excited, lethargic, anxious, playful?</li>
          <li><strong>Food and water:</strong> Did they eat or drink during the walk (for longer sessions)?</li>
          <li><strong>Photos:</strong> At least one photo from the walk itself</li>
          <li><strong>Notes:</strong> Anything the walker noticed — a slight limp, unusual sneezing, a cut on the paw</li>
        </ul>
        <p>For grooming sessions, the report includes which services were done, any skin conditions noticed (dryness, redness, tick presence), ear and nail health, and coat condition.</p>

        <h2>Why vets find these useful</h2>
        <p>Dr. Kavitha Nair, a small animal vet practising in Andheri West, put it simply: &quot;When a client comes in and can show me three weeks of care reports, I can see patterns I would never catch from a 20-minute appointment. A dog whose poop was perfectly normal for two weeks but changed consistency on a specific day — that&apos;s a clue. A dog who was energetic every morning but started the walk slow on Tuesday — that&apos;s worth investigating.&quot;</p>
        <p>The problem isn&apos;t that pet parents don&apos;t care. It&apos;s that memory is unreliable, especially for subtle changes. A care report creates a timestamped log that removes the guesswork.</p>

        <h2>Real example: how a care report caught a problem early</h2>
        <p>One pet parent in Juhu received a care report from her walker that noted her 4-year-old Beagle was &quot;slower than usual on the return leg&quot; and had only peed once instead of the usual three times. She forwarded the report to her vet before the appointment. The vet asked her to bring the dog in that afternoon instead of waiting for the scheduled visit the following week. The Beagle had a urinary tract infection that was caught early enough to treat without hospitalisation.</p>
        <p>Without the care report, she might have noticed something was off a few days later — or not at all, until it became serious.</p>

        <h2>How to claim your dog&apos;s care reports on PupStep</h2>
        <p>If your walker uses PupStep, reports are sent directly to your account after every walk. You can view them on your phone, download them as PDFs, and share them directly with your vet. Your data is stored permanently and never deleted — so as long as your subscription is active, you have months of health history ready whenever you visit a new vet or see a specialist.</p>
        <p>Ask your current walker to start using PupStep reports. If they&apos;re not on the platform yet, they can join and register your dog for free. The reports cost nothing extra — they&apos;re part of the service.</p>

        <h2>What to do with your reports</h2>
        <ul>
          <li>Download the last 30 days of reports before every vet visit</li>
          <li>Keep a folder by year — useful for annual check-ups and insurance claims</li>
          <li>If you notice a pattern in your reports (more tired on certain days, appetite changes), mention it to your vet proactively</li>
          <li>Share reports with groomers so they can see health history before a session</li>
        </ul>

        <p className="text-sm text-slate-400 mt-8 pt-6 border-t border-slate-100">Questions about care reports? Email us at <a href="mailto:melroy@verfolia.com" className="underline text-green-800">melroy@verfolia.com</a> or WhatsApp <a href="https://wa.me/919892620677" className="underline text-green-800">+91 98926 20677</a>.</p>
      </>
    ),
  },
  {
    slug: 'dog-grooming-guide-mumbai',
    category: 'Grooming',
    categoryColor: '#F5F3FF',
    categoryText: '#4C1D95',
    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=80',
    title: 'The complete dog grooming guide for Mumbai pet parents',
    date: 'May 28, 2026',
    readTime: '6 min read',
    author: 'PupStep Team',
    content: (
      <>
        <p>Mumbai&apos;s climate is one of the toughest in India for dog coats. High humidity for nearly 8 months of the year, extreme heat in May and June, and the salt air near the coast in Juhu and Versova create a combination that most grooming advice from North India or abroad simply doesn&apos;t account for.</p>
        <p>We spoke to four verified groomers working in the western suburbs to put together a guide that actually applies here.</p>

        <h2>How often should you groom in Mumbai?</h2>
        <p>The honest answer: more often than you think, and breed-dependent.</p>
        <ul>
          <li><strong>Short-coat breeds</strong> (Labrador, Beagle, Dalmatian): Bath every 4–6 weeks. Brush weekly to remove shed hair and reduce the coat trapping humidity.</li>
          <li><strong>Double-coat breeds</strong> (German Shepherd, Husky, Golden Retriever): Monthly full grooming including blow-dry and deshedding. In monsoon, move to 3-week intervals — wet undercoat in Mumbai humidity is a hotbed for fungal infections.</li>
          <li><strong>Long-coat breeds</strong> (Shih Tzu, Maltese, Lhasa Apso): Every 3–4 weeks. These breeds mop up every puddle and drain during monsoon. Daily brushing at home between sessions is essential.</li>
          <li><strong>Wire or curly coats</strong> (Poodle, Cocker Spaniel): 4–5 weeks. Curly coats don&apos;t shed but tangle badly in humidity. Skipping sessions leads to matting that is painful to remove.</li>
        </ul>

        <h2>The monsoon problem: humidity and fungal infections</h2>
        <p>Between June and September, most grooming issues in Mumbai dogs stem from one thing: coats that stay damp too long. A dog that&apos;s walked in the rain and not properly dried becomes a walking environment for yeast and bacteria. Signs to watch for: constant scratching especially around the ears, a musty or sour smell from the coat, dark crusty discharge in the ear canal.</p>
        <p>Groomers here strongly recommend:</p>
        <ul>
          <li>Using a proper pet blow-dryer (not a human hair dryer) after every bath — air-drying in Mumbai humidity doesn&apos;t actually dry the undercoat</li>
          <li>Checking ears weekly during monsoon and wiping with a vet-approved ear cleaner</li>
          <li>Keeping the hair between paw pads trimmed short — this area stays wet longest</li>
        </ul>

        <h2>What services actually matter vs. what&apos;s a nice-to-have</h2>
        <p><strong>Non-negotiable for health:</strong></p>
        <ul>
          <li>Nail trimming — overgrown nails affect posture and can curl into the paw pad</li>
          <li>Ear cleaning — especially for floppy-eared breeds in Mumbai humidity</li>
          <li>Anal gland expression — most owners don&apos;t realise this is needed until the dog starts scooting</li>
          <li>Tick check and removal — Mumbai dogs walk near gardens and are at real risk</li>
        </ul>
        <p><strong>Genuinely useful in Mumbai:</strong></p>
        <ul>
          <li>Deshedding treatments for double-coat breeds (reduces coat weight and humidity trap)</li>
          <li>Paw balm treatment (salt and heat crack paw pads faster here than in most cities)</li>
          <li>Anti-fungal shampoos for dogs prone to skin issues</li>
        </ul>
        <p><strong>Optional but pleasant:</strong></p>
        <ul>
          <li>Teeth brushing (useful but dogs need conditioning to tolerate it)</li>
          <li>Coat conditioner treatments</li>
          <li>Cologne or deodorant spray (fine, but address the cause of odour, not just the symptom)</li>
        </ul>

        <h2>Finding a good groomer: what to look for</h2>
        <p>Any groomer can bathe a dog. The difference is in how they handle a nervous dog and what they notice during the session. A good groomer will tell you after the session: &quot;I found a small lump near the left shoulder&quot; or &quot;the ears had significant dark discharge — you should get that checked.&quot;</p>
        <p>Questions to ask before booking:</p>
        <ul>
          <li>Do you send a report or photos after the session?</li>
          <li>How do you handle a dog that is scared or aggressive?</li>
          <li>Are cages used? (For how long? Some mobile groomers avoid cages entirely)</li>
          <li>What shampoo brands do you use? (Avoid any groomer who can&apos;t name their products)</li>
        </ul>

        <h2>Grooming at home between sessions</h2>
        <p>Five minutes of brushing three times a week prevents most matting and keeps shedding manageable. Use a slicker brush for most breeds, a rubber curry brush for short coats. Check paws after every walk during monsoon — between the toes specifically. Keep a small bottle of diluted povidone-iodine near the door for paw soaks when you suspect contact with dirty puddle water.</p>

        <p className="text-sm text-slate-400 mt-8 pt-6 border-t border-slate-100">Looking for a verified groomer in Juhu or Andheri West? <Link href="/grooming" className="underline text-purple-800">Browse verified groomers on PupStep</Link>.</p>
      </>
    ),
  },
  {
    slug: 'juhu-pet-community',
    category: 'Community',
    categoryColor: '#FFF1F2',
    categoryText: '#9F1239',
    image: 'https://images.unsplash.com/photo-1450778869180-366b5a8ae4cf?auto=format&fit=crop&w=1200&q=80',
    title: 'Inside Juhu\'s growing pet community',
    date: 'May 20, 2026',
    readTime: '7 min read',
    author: 'PupStep Team',
    content: (
      <>
        <p>If you walk a dog in Juhu before 7:30 am, you will run into the same twenty-odd people most mornings. A Golden Retriever named Butter who pulls toward every stranger. Two Shih Tzus belonging to a couple who retired here from Delhi. A Dalmatian who has been walked by the same man since 2019. By 8 am, half the dog parents have stopped to chat, traded groomer recommendations, and exchanged vet numbers.</p>
        <p>This is the Juhu pet community in its most basic form: organic, neighbour-to-neighbour, built on shared mornings along the beach promenade.</p>

        <h2>Why the western suburbs became pet country</h2>
        <p>Mumbai as a whole is a difficult city for dogs. Dense apartment buildings, traffic on every street, limited open spaces. But the western suburbs — specifically the stretch from Andheri West through Juhu and up to Versova — developed differently. Lower-rise buildings with compound gardens. The Juhu beach promenade as a proper pedestrian strip. Carter Road in Bandra as a social hub. Building societies with designated pet-friendly policies.</p>
        <p>The result is a density of dog-owning households that is unusually high for an Indian metro. By some estimates, Juhu has more registered pets per square kilometre than any other neighbourhood in the city.</p>

        <h2>How the community actually works</h2>
        <p>Most of it happens informally. WhatsApp groups for individual building societies. Morning walk regulars who look out for each other&apos;s dogs. Shared knowledge about which vet opens on Sundays, which groomer gives fair prices, which pet store stocks the grain-free brands.</p>
        <p>Larger events have started appearing: monthly &quot;yappy hours&quot; at a restaurant near the beach that allows dogs on the terrace. Weekend dog playdates organised by apartment society committees. A small dog park maintained by a residents&apos; welfare association in the Vile Parle extension area.</p>
        <p>The Facebook groups for Mumbai pet parents have tens of thousands of members, but the active, trusted conversations still happen in the smaller groups — the building WhatsApp, the 20-person morning walk crew.</p>

        <h2>The challenges this community navigates</h2>
        <p>Pet ownership in a dense urban area creates friction that rural pet owners rarely face. Dogs that bark annoy neighbours in adjoining flats. Stray dog interactions on morning walks can be dangerous if handled poorly. Not every building society is pet-friendly, and the rules can change with a new committee chairman.</p>
        <p>There&apos;s also the service problem. Finding a reliable dog walker who won&apos;t cancel at 6 am. Finding a groomer who won&apos;t handle your anxious rescue roughly. Finding a vet who has after-hours emergency access. These aren&apos;t solved problems in Juhu — they&apos;re recurring frustrations that most pet parents solve by leaning on their personal networks.</p>

        <h2>What&apos;s growing</h2>
        <p>In the last two years, a few things have shifted. Verified service providers are becoming a category — people who have built a reputation specifically in the western suburbs and are known by name by multiple families. Pet-first cafes and restaurants are appearing (though Mumbai&apos;s BMC regulations on animals in food establishments still create grey areas). Dog training clubs have started formal group sessions at Juhu beach during off-peak hours.</p>
        <p>The community is also getting younger. A wave of millennial pet parents who moved to Mumbai for work and chose western suburb apartments specifically because they were more pet-accommodating has changed the demographic. These are people who grew up with social media and expect more from a service ecosystem than a phone number from a friend-of-a-friend.</p>

        <h2>What this means for pet services in the area</h2>
        <p>The demand for professional, accountable pet services in Juhu and the western suburbs has never been higher. At the same time, trust is still built on reputation and word-of-mouth. A walker who consistently sends care reports, responds to messages within an hour, and handles an emergency well becomes the person every pet parent recommends. The community is small enough that one bad experience travels fast — and one excellent one does too.</p>
        <p>PupStep exists to make this ecosystem easier to navigate. Instead of asking around in a building WhatsApp group, you can find a verified provider with real reviews and a clear service offering. The community&apos;s trust infrastructure, built neighbourhood by neighbourhood over years, is the thing we want to make accessible rather than replace.</p>

        <p className="text-sm text-slate-400 mt-8 pt-6 border-t border-slate-100">Are you a pet parent in Juhu, Versova or Andheri West? <Link href="/broadcast" className="underline text-rose-800">Post a request</Link> and get responses from verified local providers.</p>
      </>
    ),
  },
  {
    slug: 'vet-visit-checklist-mumbai',
    category: 'Health',
    categoryColor: '#E0F2FE',
    categoryText: '#0C4A6E',
    image: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=1200&q=80',
    title: '10 things to bring to every vet visit in Mumbai',
    date: 'May 12, 2026',
    readTime: '4 min read',
    author: 'PupStep Team',
    content: (
      <>
        <p>Vets in Mumbai will tell you the same thing: most pet parents arrive to appointments underprepared. Not because they don&apos;t care — they do, deeply — but because nobody told them what to bring. Here&apos;s the complete list, plus a few things that are more useful in Mumbai specifically than in other cities.</p>

        <h2>The essential 10</h2>

        <h3>1. Vaccination record book</h3>
        <p>This should be a physical booklet, not a photo on your phone. The booklet has the vet&apos;s stamp, the batch number of the vaccine, and the date — all of which matter if your dog bites someone, is involved in a stray dog incident, or travels by air. Keep the original; bring it to every appointment. If you&apos;ve lost it, ask your current vet to issue a duplicate with what they have on file.</p>

        <h3>2. Care reports from the last 30 days</h3>
        <p>If your dog walker uses PupStep, download the last month of reports as a PDF before you leave home. Energy levels, bathroom frequency, appetite notes from walks — this is the kind of contextual data your vet can&apos;t get from a 15-minute appointment. It also saves you from trying to remember whether your dog peed normally &quot;last Tuesday or the Tuesday before.&quot;</p>

        <h3>3. A fresh stool sample (for routine check-ups)</h3>
        <p>For any general wellness visit or if your dog has had loose stools, bring a stool sample collected within 2 hours of the appointment. A small container from your pharmacy works. This allows a fecal test on the spot if the vet suspects worms or Giardia — common in Mumbai dogs that walk near street dogs or water-logged areas during monsoon.</p>

        <h3>4. A list of everything your dog ate in the last 3 days</h3>
        <p>Especially relevant if you feed home-cooked food or give treats from multiple sources. Vets asking about diet changes can only work with what you tell them. If your dog has a stomach issue and you can&apos;t remember what changed, the appointment becomes guesswork.</p>

        <h3>5. Current medications and supplements</h3>
        <p>Bring the actual boxes or bottles, not just the names. Dosages and formulations matter. If your dog is on a joint supplement, a skin spray, a dewormer, and a coat oil — bring all of it. Drug interactions are more common than people assume, especially with some over-the-counter products available at pet stores.</p>

        <h3>6. Your dog&apos;s weight from last month</h3>
        <p>Most vets weigh dogs at every appointment, but having a recent home measurement (if you have a pet scale, or you can weigh yourself holding the dog and then without) gives a baseline for tracking. Weight changes in dogs often precede visible symptoms of illness by weeks.</p>

        <h3>7. Photos or videos of the symptom</h3>
        <p>If your dog has been limping occasionally but is fine by the time you reach the clinic, a 10-second video is worth more than any description. Same for a rash that comes and goes, a cough at specific times of day, or unusual behaviour around food. Keep a habit of filming anything that concerns you before it stops happening.</p>

        <h3>8. A note on vet bills</h3>
        <p>If your building society or employer offers any health reimbursement benefit, keep original bills from every visit. Some Mumbai vets can issue itemised receipts — always ask for one even if you don&apos;t need it immediately.</p>

        <h3>9. A non-slip mat or towel for the examination table</h3>
        <p>This is a Mumbai-specific tip. Most vet clinics in the western suburbs are busy practices with examination tables that are smooth metal or plastic — slippery for anxious dogs. A small rubber mat or a folded cotton towel from home helps your dog feel more stable on the table and reduces stress during the examination. Less stress means a more accurate physical assessment.</p>

        <h3>10. Emergency contact numbers for after-hours</h3>
        <p>Most vet clinics in Juhu and Andheri West are single-practitioner setups that close by 8 or 9 pm. Ask your vet who to call after hours for an emergency. There are two 24-hour animal emergency facilities in Mumbai — ask your regular vet to write down the contact and keep it on your phone and on paper at home. You will not think clearly enough to Google it at midnight if your dog is in distress.</p>

        <h2>A note on timing</h2>
        <p>The best time to visit most private vets in Juhu and Andheri West is Tuesday to Friday, 10 am to noon. Weekends and Monday mornings are their busiest periods. If it&apos;s a non-urgent visit, booking a midweek morning slot usually means more time with the vet and shorter waits.</p>

        <p className="text-sm text-slate-400 mt-8 pt-6 border-t border-slate-100">Looking for a vet in the western suburbs? <Link href="/vet" className="underline text-sky-800">Browse verified vets on PupStep</Link> or WhatsApp us at <a href="https://wa.me/919892620677" className="underline text-sky-800">+91 98926 20677</a>.</p>
      </>
    ),
  },
]

export function generateStaticParams() {
  return POSTS.map(post => ({ slug: post.slug }))
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = POSTS.find(p => p.slug === slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen" style={{ background: '#FFFBEB' }}>

      {/* Hero image */}
      <div className="w-full overflow-hidden" style={{ maxHeight: '420px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image}
          alt={post.title}
          className="w-full object-cover"
          style={{ height: '420px' }}
        />
      </div>

      <article className="max-w-2xl mx-auto px-5 py-12">

        {/* Back link */}
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium mb-8 transition-colors"
          style={{ color: '#0A8A96' }}>
          ← Back to blog
        </Link>

        {/* Meta */}
        <div className="flex items-center gap-2.5 mb-5 flex-wrap">
          <span className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: post.categoryColor, color: post.categoryText }}>
            {post.category}
          </span>
          <span className="text-xs text-slate-400">{post.date}</span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-400">{post.readTime}</span>
        </div>

        {/* Title */}
        <h1
          className="font-display text-slate-900 mb-6"
          style={{ fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', lineHeight: 1.15, letterSpacing: '-0.02em' }}
        >
          {post.title}
        </h1>

        {/* Author strip */}
        <div className="flex items-center gap-3 mb-10 pb-10"
          style={{ borderBottom: '1.5px solid rgba(0,0,0,0.08)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: '#FEF3C7', color: '#78350F' }}>
            🐾
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{post.author}</p>
            <p className="text-xs text-slate-400">Juhu, Mumbai</p>
          </div>
        </div>

        {/* Article content */}
        <div
          className="prose-content text-slate-700"
          style={{ lineHeight: 1.75, fontSize: '1.0625rem' }}
        >
          {post.content}
        </div>

        {/* CTA strip */}
        <div className="mt-14 rounded-2xl p-6 sm:p-8"
          style={{ background: 'linear-gradient(135deg, #0A2F35, #0D3D45)' }}>
          <p className="font-bold text-white text-lg mb-1">Find verified pet services near you</p>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Every provider on PupStep is manually verified. Juhu · Versova · Andheri West · Santacruz West.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/search"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full font-bold text-sm"
              style={{ background: '#F59E0B', color: '#451A03' }}>
              Find providers →
            </Link>
            <Link href="/blog"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}>
              More articles
            </Link>
          </div>
        </div>

      </article>

      <style>{`
        .prose-content h2 {
          font-family: var(--font-display, serif);
          font-size: 1.35rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
          letter-spacing: -0.01em;
          line-height: 1.25;
        }
        .prose-content h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #334155;
          margin-top: 1.75rem;
          margin-bottom: 0.5rem;
        }
        .prose-content p {
          margin-bottom: 1.25rem;
        }
        .prose-content ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin-bottom: 1.25rem;
        }
        .prose-content ul li {
          margin-bottom: 0.5rem;
        }
        .prose-content a {
          color: #0A8A96;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .prose-content strong {
          color: #1e293b;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
