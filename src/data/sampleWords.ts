// 示例单词数据
export const sampleWords = [
  {
    _id: "1",
    word: "hello",
    pronunciation: "həˈləʊ",
    meanings: [
      {
        partOfSpeech: "interj.",
        definition: "用于问候或引起注意的感叹词",
        example: "Hello! How are you today?"
      },
      {
        partOfSpeech: "n.",
        definition: "问候语",
        example: "He gave me a warm hello."
      }
    ],
    fsrs: {
      difficulty: 5,
      stability: 2.5,
      retrievability: 0,
      status: 'new',
      due: new Date(),
      lapses: 0,
      reps: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      seed: 1234
    }
  },
  {
    _id: "2",
    word: "world",
    pronunciation: "wɜːld",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "世界；地球",
        example: "The world is full of wonderful places."
      },
      {
        partOfSpeech: "n.",
        definition: "世人；人类",
        example: "The whole world watched the Olympics."
      }
    ],
    fsrs: {
      difficulty: 5,
      stability: 2.5,
      retrievability: 0,
      status: 'new',
      due: new Date(),
      lapses: 0,
      reps: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      seed: 1235
    }
  },
  {
    _id: "3",
    word: "airplane",
    pronunciation: "ˈeəpleɪn",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "飞机",
        example: "The airplane took off on schedule."
      }
    ],
    fsrs: {
      difficulty: 5,
      stability: 2.5,
      retrievability: 0,
      status: 'new',
      due: new Date(),
      lapses: 0,
      reps: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      seed: 1236
    }
  },
  {
    _id: "4",
    word: "safety",
    pronunciation: "ˈseɪfti",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "安全；安全性",
        example: "Safety is our top priority."
      }
    ],
    fsrs: {
      difficulty: 5,
      stability: 2.5,
      retrievability: 0,
      status: 'new',
      due: new Date(),
      lapses: 0,
      reps: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      seed: 1237
    }
  },
  {
    _id: "5",
    word: "emergency",
    pronunciation: "ɪˈmɜːdʒənsi",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "紧急情况；突发事件",
        example: "In case of emergency, please follow the instructions."
      },
      {
        partOfSpeech: "adj.",
        definition: "紧急的",
        example: "We need to make an emergency landing."
      }
    ],
    fsrs: {
      difficulty: 5,
      stability: 2.5,
      retrievability: 0,
      status: 'new',
      due: new Date(),
      lapses: 0,
      reps: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      seed: 1238
    }
  },
  {
    _id: "6",
    word: "passenger",
    pronunciation: "ˈpæsɪndʒə",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "乘客；旅客",
        example: "All passengers must fasten their seatbelts."
      }
    ],
    fsrs: {
      difficulty: 5,
      stability: 2.5,
      retrievability: 0,
      status: 'new',
      due: new Date(),
      lapses: 0,
      reps: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      seed: 1239
    }
  },
  {
    _id: "7",
    word: "departure",
    pronunciation: "dɪˈpɑːtʃə",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "出发；离开",
        example: "The departure time is 3:30 PM."
      }
    ],
    fsrs: {
      difficulty: 5,
      stability: 2.5,
      retrievability: 0,
      status: 'new',
      due: new Date(),
      lapses: 0,
      reps: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      seed: 1240
    }
  },
  {
    _id: "8",
    word: "arrival",
    pronunciation: "əˈraɪvl",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "到达；抵达",
        example: "The arrival time is 6:45 PM."
      }
    ],
    fsrs: {
      difficulty: 5,
      stability: 2.5,
      retrievability: 0,
      status: 'new',
      due: new Date(),
      lapses: 0,
      reps: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      seed: 1241
    }
  },
  {
    _id: "9",
    word: "captain",
    pronunciation: "ˈkæptɪn",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "船长；机长",
        example: "The captain announced the flight delay."
      }
    ],
    fsrs: {
      difficulty: 5,
      stability: 2.5,
      retrievability: 0,
      status: 'new',
      due: new Date(),
      lapses: 0,
      reps: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      seed: 1242
    }
  },
  {
    _id: "10",
    word: "crew",
    pronunciation: "kruː",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "机组人员；船员",
        example: "The crew is well-trained and professional."
      }
    ],
    fsrs: {
      difficulty: 5,
      stability: 2.5,
      retrievability: 0,
      status: 'new',
      due: new Date(),
      lapses: 0,
      reps: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      seed: 1243
    }
  }
];

export const sampleWordbook = {
  _id: "demo-wordbook",
  name: "航空安全英语基础词汇",
  description: "专为航空安全员设计的基础英语词汇，包含常用的航空术语和安全相关词汇",
  cover: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop",
  totalCount: sampleWords.length,
  category: "aviation",
  difficulty: "beginner",
  progress: 0
};