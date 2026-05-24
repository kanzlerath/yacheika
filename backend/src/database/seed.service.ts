import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { VenueEntity } from '../entities/venue.entity';
import { EventEntity } from '../entities/event.entity';
import { CollectionEntity } from '../entities/collection.entity';
import { ReactionEntity } from '../entities/reaction.entity';
import { AnalyticsEventEntity } from '../entities/analytics.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(VenueEntity)
    private readonly venueRepository: Repository<VenueEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(CollectionEntity)
    private readonly collectionRepository: Repository<CollectionEntity>,
    @InjectRepository(ReactionEntity)
    private readonly reactionRepository: Repository<ReactionEntity>,
    @InjectRepository(AnalyticsEventEntity)
    private readonly analyticsRepository: Repository<AnalyticsEventEntity>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Checking database status for seeding...');

    // Gate seeding in production
    const isProduction = process.env.NODE_ENV === 'production';
    const forceSeed = process.env.SEED_DATABASE === 'true';
    if (isProduction && !forceSeed) {
      this.logger.log('Production environment detected and SEED_DATABASE is not true. Skipping database seeding.');
      return;
    }

    const venueCount = await this.venueRepository.count();
    if (venueCount > 0) {
      this.logger.log('Database already has data. Skipping seeding.');
      return;
    }

    this.logger.log('Database is empty. Starting seeding process...');

    // 1. Seed Telegram Users
    const mockUsers = [
      {
        id: 'tg-dmitry',
        telegramId: '12345678',
        username: 'nsk_bar_hunter',
        firstName: 'Дмитрий',
        lastName: 'Гордеев',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      },
      {
        id: 'tg-dasha',
        telegramId: '87654321',
        username: 'dasha_vibe',
        firstName: 'Дарья',
        lastName: 'Смирнова',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
      },
      {
        id: 'tg-mikhail',
        telegramId: '99887766',
        username: 'mikhail_tech',
        firstName: 'Михаил',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=150',
      },
    ];

    for (const u of mockUsers) {
      const user = this.userRepository.create({
        ...u,
        createdAt: new Date(),
      });
      await this.userRepository.save(user);
    }
    this.logger.log(`Seeded ${mockUsers.length} core mock users.`);

    // Seed 2000 dummy users in bulk to ensure referential integrity for reactions
    const dummyUsers = [];
    for (let i = 0; i < 2000; i++) {
      dummyUsers.push({
        id: `tg-dummy-${i}`,
        telegramId: `dummy-${i}`,
        username: `dummy_user_${i}`,
        firstName: `Dummy_${i}`,
        createdAt: new Date(),
      });
    }
    await this.userRepository.insert(dummyUsers);
    this.logger.log('Seeded 2000 dummy users in bulk.');

    // Photo presets from mock server
    const PHOTO_PRESETS = [
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1511105612625-2c9434778f3f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1563842947141-946f403b4d57?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=800',
    ];

    // 2. Seed Venues
    const venuesData = [
      {
        id: 'v-friends',
        name: 'Friends Bar',
        slug: 'friends-bar',
        category: 'коктейльный бар',
        shortDescription: 'Тот самый легендарный дружелюбный коктейльный бар в самом центре.',
        fullDescription: 'Здесь нет пафоса, зато есть отличные авторские коктейли, душевные разговоры у стойки и неудержимое веселье по выходным. Бармены подберут микс по вашему настроению и приготовят идеальный напиток. По выходным здесь стихийные танцы у столов и лучшие пластинки.',
        address: 'Красный проспект, 22',
        latitude: 55.0267,
        longitude: 82.9218,
        workingHours: 'Ежедневно с 18:00 до 03:00, Пт-Сб до 05:00',
        contacts: {
          phone: '+7 (383) 222-77-77',
          telegram: 'friends_bar_nsk',
          instagram: 'friends_bar',
          website: 'http://friendsbar.ru',
        },
        gallery: [PHOTO_PRESETS[5], PHOTO_PRESETS[1], PHOTO_PRESETS[3]],
        tags: ['коктейли', 'свидание', 'шумно', 'afterwork', 'DJ'],
        status: 'published',
        premiumConfig: {
          premiumActive: true,
          premiumTheme: 'crimson-glow',
          customColors: {
            primary: '#140a0c',
            accent: '#f43f5e',
            glowColor: 'rgba(244, 63, 94, 0.4)',
          },
          heroImage: PHOTO_PRESETS[5],
          moodBlock: 'Сегодня играем фанк на виниле с 22:00. Приходи пить Penicillin!',
          featuredDrinks: ['Penicillin', 'Tommy\'s Margarita', 'Red Room Cobbler'],
        },
        seedLikes: 142,
        seedNotMyPlaces: 4,
        seedVibeRatings: { 'Душевно': 68, 'Танцы': 45, 'Крутой персонал': 52 },
      },
      {
        id: 'v-fry',
        name: 'FRY ciders & drafts',
        slug: 'fry-ciders',
        category: 'крафтовый бар',
        shortDescription: 'Шумный пивной дворик с лучшей уличной атмосферой в городе.',
        fullDescription: 'Знаковое место встреч творческой молодежи Новосибирска во внутреннем дворике на Ленина 3. Огромный ассортимент крафтового пива, сидров, кисляков и вкусного стритфуда. Место, где стираются границы, а вечер всегда превращается в незабываемое приключение под открытым небом.',
        address: 'ул. Ленина, 3',
        latitude: 55.0302,
        longitude: 82.9189,
        workingHours: 'Пн-Чт 16:00-01:00, Пт 16:00-03:00, Сб 14:00-03:00, Вс 14:00-01:00',
        contacts: {
          telegram: 'fry_bar_nsk',
          vk: 'fry_cider_pub',
        },
        gallery: [PHOTO_PRESETS[4], PHOTO_PRESETS[0], PHOTO_PRESETS[8]],
        tags: ['крафт', 'летник', 'шумно', 'веранда', 'DJ'],
        status: 'published',
        premiumConfig: {
          premiumActive: false,
        },
        seedLikes: 204,
        seedNotMyPlaces: 12,
        seedVibeRatings: { 'Шумно': 95, 'Лампово во дворе': 112, 'Кислое пиво': 45 },
      },
      {
        id: 'v-incider',
        name: 'InCider Сидрерия',
        slug: 'incider-сидры',
        category: 'крафтовый бар',
        shortDescription: 'Камерная сидрерия с уютными гирляндами и ламповым летником.',
        fullDescription: 'Локальный уютный бар, спрятанный в тихом переулке Октябрьской. Специализируется на сухих традиционных сидрах из Франции, Испании, Англии, а также лучших российских сидроварнях. Идеальная локация для неспешных вечерних бесед в свете теплых ретро-гирлянд.',
        address: 'ул. Октябрьская, 45а',
        latitude: 55.0255,
        longitude: 82.9192,
        workingHours: 'Ежедневно с 15:00 до 00:00, Пт-Сб до 02:00',
        contacts: {
          phone: '+7 (913) 456-12-34',
          instagram: 'incider_nsk',
        },
        gallery: [PHOTO_PRESETS[3], PHOTO_PRESETS[0]],
        tags: ['крафт', 'летник', 'тихо', 'cozy', 'afterwork'],
        status: 'published',
        premiumConfig: {
          premiumActive: true,
          premiumTheme: 'amber-smoke',
          customColors: {
            primary: '#0d0a07',
            accent: '#f59e0b',
            glowColor: 'rgba(245, 158, 11, 0.4)',
          },
          heroImage: PHOTO_PRESETS[3],
          moodBlock: 'Расслабленная атмосфера, горячий сырный сэндвич и свежий сухой яблочный сидр из Астурии.',
          featuredDrinks: ['Sidra Trabanco', 'Cidre Breton', 'Локальный Вишневый Саур'],
        },
        seedLikes: 98,
        seedNotMyPlaces: 2,
        seedVibeRatings: { 'Тихий вечер': 48, 'Ламповый свет': 39, 'Вкусный сыр': 18 },
      },
      {
        id: 'v-hide',
        name: 'Hide Secret Bar',
        slug: 'hide-secret-bar',
        category: 'коктейльный бар',
        shortDescription: 'Секретный бар в викторианском стиле для ценителей высокой миксологии.',
        fullDescription: 'Скрытый от посторонних глаз за глухой деревянной дверью на Коммунистической. Камерный полумрак, изумрудные тона, бархатная мебель и викторианский лоск. Подача коктейлей здесь — настоящее искусство с сухим льдом, парфюмами для бокалов и кастомной стеклянной посудой.',
        address: 'ул. Коммунистическая, 43',
        latitude: 55.0238,
        longitude: 82.9241,
        workingHours: 'Чт, Вс 19:00 - 02:00, Пт-Сб 19:00 - 04:00',
        contacts: {
          telegram: 'hide_secret_bar',
          instagram: 'hide_nsk',
        },
        gallery: [PHOTO_PRESETS[1], PHOTO_PRESETS[5], PHOTO_PRESETS[4]],
        tags: ['коктейли', 'тихо', 'свидание', 'cozy'],
        status: 'published',
        premiumConfig: {
          premiumActive: true,
          premiumTheme: 'emerald-vault',
          customColors: {
            primary: '#050b07',
            accent: '#10b981',
            glowColor: 'rgba(16, 185, 129, 0.4)',
          },
          heroImage: PHOTO_PRESETS[1],
          moodBlock: 'Сегодня тушим свет, зажигаем свечи. Идеальное время для интимных свиданий за авторским сауэром.',
          featuredDrinks: ['Emerald Basil Sour', 'Black Truffle Negroni', 'Smoky Islay Cobbler'],
        },
        seedLikes: 115,
        seedNotMyPlaces: 3,
        seedVibeRatings: { 'Мистический полумрак': 54, 'Эстетичный вечер': 62, 'Сверх-сервис': 28 },
      },
      {
        id: 'v-rooks',
        name: 'The Rooks Shop & Pub',
        slug: 'the-rooks-nsk',
        category: 'крафтовый бар',
        shortDescription: 'Центр бунтарского крафта, гик-тусовок и сибирского рока.',
        fullDescription: 'Легендарный спонсор веселья на Коммунистической. Каждые выходные здесь гремит музыка, рекой льются сидры собственной варки и оригинальный крафт. Сюда приходят за настоящим неформальным барным угаром, настолками, выступлениями стендаперов или виниловыми сетами местных диджеев.',
        address: 'ул. Коммунистическая, 45',
        latitude: 55.0242,
        longitude: 82.9238,
        workingHours: 'Ежедневно с 12:00 до 02:00, Пт-Сб до 05:00',
        contacts: {
          phone: '+7 (923) 124-44-55',
          telegram: 'therooksbar',
          vk: 'therooks_nsk',
        },
        gallery: [PHOTO_PRESETS[6], PHOTO_PRESETS[7]],
        tags: ['крафт', 'шумно', 'DJ', 'настолки'],
        status: 'published',
        premiumConfig: {
          premiumActive: false,
        },
        seedLikes: 178,
        seedNotMyPlaces: 22,
        seedVibeRatings: { 'Рок угар': 88, 'Шумная толпа': 74, 'Локальный сидр': 49 },
      },
      {
        id: 'v-pardon',
        name: 'Pardon My French',
        slug: 'pardon-french-wine',
        category: 'винный бар',
        shortDescription: 'Изысканное вино и сибирские сыры в утонченном приватном интерьере.',
        fullDescription: 'Бистро-бар для интеллигентного и эстетичного отдыха. Огромная винная карта с редкими биодинамическими позициями, отличный кофе и потрясающие брускетты с фермерскими сибирскими сырами. По выходным — тихие лекции сомелье и камерное звучание французского джаза на фоне.',
        address: 'Красный проспект, 17/1',
        latitude: 55.0289,
        longitude: 82.9201,
        workingHours: 'Пн-Чт 12:00-00:00, Пт-Сб 12:00-02:00, Вс 14:00-00:00',
        contacts: {
          phone: '+7 (383) 310-99-88',
          telegram: 'pardon_wine_nsk',
          website: 'https://pardonwine.ru',
        },
        gallery: [PHOTO_PRESETS[2], PHOTO_PRESETS[3]],
        tags: ['винный бар', 'тихо', 'свидание', 'afterwork', 'веранда'],
        status: 'published',
        premiumConfig: {
          premiumActive: true,
          premiumTheme: 'violet-night',
          customColors: {
            primary: '#0a060d',
            accent: '#a855f7',
            glowColor: 'rgba(168, 85, 247, 0.4)',
          },
          heroImage: PHOTO_PRESETS[2],
          moodBlock: 'Сегодня дегустация натуральных оранжевых вин в сопровождении козьего сыра.',
          featuredDrinks: ['Orange Pet-Nat', 'Pinot Noir Reserve', 'Jura Chardonnay'],
        },
        seedLikes: 89,
        seedNotMyPlaces: 1,
        seedVibeRatings: { 'Эстетично': 65, 'Тихая беседа': 34, 'Редкое вино': 41 },
      },
    ];

    let dummyUserIndex = 0;
    for (const vData of venuesData) {
      const { seedLikes, seedNotMyPlaces, seedVibeRatings, ...v } = vData;
      const venue = this.venueRepository.create({
        ...v,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Partial<VenueEntity>);
      await this.venueRepository.save(venue);

      const venueReactions = [];

      // 1. Seed likes
      for (let i = 0; i < seedLikes; i++) {
        venueReactions.push({
          id: `r-like-${venue.id}-${i}`,
          userId: `tg-dummy-${dummyUserIndex++}`,
          venueId: venue.id,
          type: 'like',
          createdAt: new Date(),
        });
      }

      // 2. Seed not my places
      for (let i = 0; i < seedNotMyPlaces; i++) {
        venueReactions.push({
          id: `r-nmp-${venue.id}-${i}`,
          userId: `tg-dummy-${dummyUserIndex++}`,
          venueId: venue.id,
          type: 'not_my_place',
          createdAt: new Date(),
        });
      }

      // 3. Seed vibe tags
      for (const [tag, count] of Object.entries(seedVibeRatings)) {
        for (let i = 0; i < count; i++) {
          venueReactions.push({
            id: `r-vibe-${venue.id}-${tag}-${i}`,
            userId: `tg-dummy-${dummyUserIndex++}`,
            venueId: venue.id,
            type: 'vibe_tag',
            vibeTag: tag,
            createdAt: new Date(),
          });
        }
      }

      if (venueReactions.length > 0) {
        await this.reactionRepository.insert(venueReactions);
      }
    }
    this.logger.log(`Seeded ${venuesData.length} venues and their corresponding reactions.`);

    // 3. Seed Events
    const eventsData = [
      {
        id: 'e-vinyl-friends',
        venueId: 'v-friends',
        title: 'Fruity Funk Vinyl Set',
        description: 'Легендарная танцевальная пятница с резидентами бара на аналоговом виниле. Угощаем пуншем на входе.',
        date: '2026-05-23',
        time: '22:00',
        coverImage: PHOTO_PRESETS[7],
      },
      {
        id: 'e-cider-tasting',
        venueId: 'v-incider',
        title: 'Дегустация испанских сидров',
        description: 'Лекция от шефа о культуре эскансирования (правильного налива) сидра из Астурии с дегустацией трех сухих сортов.',
        date: '2026-05-23',
        time: '20:00',
        coverImage: PHOTO_PRESETS[3],
      },
      {
        id: 'e-techno-hide',
        venueId: 'v-hide',
        title: 'Intimate Candlelight Ambient Night',
        description: 'Задуваем электрический свет, зажигаем сотни свечей и погружаемся в интимный даунтемпо лаундж.',
        date: '2026-05-24',
        time: '21:30',
        coverImage: PHOTO_PRESETS[1],
      },
    ];

    for (const e of eventsData) {
      const event = this.eventRepository.create(e as Partial<EventEntity>);
      await this.eventRepository.save(event);
    }
    this.logger.log(`Seeded ${eventsData.length} events.`);

    // 4. Seed Collections
    const collectionsData = [
      {
        id: 'c-center-evening',
        title: 'Вечер в центре',
        description: 'Коктейльно-винный маршрут по изысканным заведениям Новосибирска для идеального свидания или неспешных интеллектуальных встреч.',
        cover: PHOTO_PRESETS[3],
        venueIds: ['v-friends', 'v-pardon', 'v-hide'],
      },
      {
        id: 'c-craft-crawl',
        title: 'Крафтовый маршрут',
        description: 'Шумный пивной поход для любителей правильного традиционного и крафтового пива, сухих испанских сидров и веселой сибирской тусовки под виниловые DJ сеты.',
        cover: PHOTO_PRESETS[4],
        venueIds: ['v-fry', 'v-incider', 'v-rooks'],
      },
    ];

    for (const c of collectionsData) {
      const collection = this.collectionRepository.create({
        id: c.id,
        title: c.title,
        description: c.description,
        cover: c.cover,
        venues: c.venueIds.map((vId) => ({ id: vId })),
        publishedAt: new Date(),
      });
      await this.collectionRepository.save(collection);
    }
    this.logger.log(`Seeded ${collectionsData.length} collections.`);

    // 5. Seed Initial Analytics Event
    const initialAnalytics = this.analyticsRepository.create({
      eventType: 'open_venue',
      venueId: 'v-friends',
      timestamp: new Date('2026-05-23T06:10:00Z'),
      metadata: { note: 'First initialization log' },
    });
    await this.analyticsRepository.save(initialAnalytics);
    this.logger.log('Seeded initial analytics event.');

    this.logger.log('Database seeding process completed successfully!');
  }
}
