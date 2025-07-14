/**
 * 导入示例单词数据
 * 为测试和演示创建基础词汇数据
 */

const cloudbase = require('@cloudbase/node-sdk');
const { initNewCard } = require('../src/utils/fsrs');

// 初始化云开发
const app = cloudbase.init({
  env: process.env.TCB_ENV || 'cloud1-7g7oatv381500c81'
});

const db = app.database();

// 示例单词数据
const sampleWords = [
  {
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
    ]
  },
  {
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
    ]
  },
  {
    word: "airplane",
    pronunciation: "ˈeəpleɪn",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "飞机",
        example: "The airplane took off on schedule."
      }
    ]
  },
  {
    word: "safety",
    pronunciation: "ˈseɪfti",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "安全；安全性",
        example: "Safety is our top priority."
      }
    ]
  },
  {
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
    ]
  },
  {
    word: "passenger",
    pronunciation: "ˈpæsɪndʒə",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "乘客；旅客",
        example: "All passengers must fasten their seatbelts."
      }
    ]
  },
  {
    word: "departure",
    pronunciation: "dɪˈpɑːtʃə",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "出发；离开",
        example: "The departure time is 3:30 PM."
      }
    ]
  },
  {
    word: "arrival",
    pronunciation: "əˈraɪvl",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "到达；抵达",
        example: "The arrival time is 6:45 PM."
      }
    ]
  },
  {
    word: "captain",
    pronunciation: "ˈkæptɪn",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "船长；机长",
        example: "The captain announced the flight delay."
      }
    ]
  },
  {
    word: "crew",
    pronunciation: "kruː",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "机组人员；船员",
        example: "The crew is well-trained and professional."
      }
    ]
  },
  {
    word: "turbulence",
    pronunciation: "ˈtɜːbjʊləns",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "湍流；气流不稳",
        example: "We may experience some turbulence during the flight."
      }
    ]
  },
  {
    word: "altitude",
    pronunciation: "ˈæltɪtuːd",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "高度；海拔",
        example: "We are flying at an altitude of 35,000 feet."
      }
    ]
  },
  {
    word: "runway",
    pronunciation: "ˈrʌnweɪ",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "跑道",
        example: "The airplane is approaching the runway."
      }
    ]
  },
  {
    word: "terminal",
    pronunciation: "ˈtɜːmɪnl",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "航站楼；终端",
        example: "Please proceed to Terminal 2 for your flight."
      }
    ]
  },
  {
    word: "boarding",
    pronunciation: "ˈbɔːdɪŋ",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "登机；上船",
        example: "Boarding will begin in 30 minutes."
      }
    ]
  },
  {
    word: "seatbelt",
    pronunciation: "ˈsiːtbelt",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "安全带",
        example: "Please fasten your seatbelt before takeoff."
      }
    ]
  },
  {
    word: "oxygen",
    pronunciation: "ˈɒksɪdʒən",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "氧气",
        example: "Oxygen masks will drop from above your seat."
      }
    ]
  },
  {
    word: "evacuation",
    pronunciation: "ɪˌvækjuˈeɪʃn",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "疏散；撤离",
        example: "In case of evacuation, follow the crew instructions."
      }
    ]
  },
  {
    word: "demonstration",
    pronunciation: "ˌdemənˈstreɪʃn",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "演示；示范",
        example: "Please watch the safety demonstration carefully."
      }
    ]
  },
  {
    word: "instruction",
    pronunciation: "ɪnˈstrʌkʃn",
    meanings: [
      {
        partOfSpeech: "n.",
        definition: "指示；说明",
        example: "Please follow the safety instructions."
      }
    ]
  }
];

async function importSampleWords() {
  try {
    console.log('🚀 开始导入示例单词数据...');
    
    // 1. 创建示例词书
    const wordbookResult = await db.collection('wordbooks').add({
      name: "航空安全英语基础词汇",
      description: "专为航空安全员设计的基础英语词汇，包含常用的航空术语和安全相关词汇",
      cover: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=300&fit=crop",
      totalCount: sampleWords.length,
      category: "aviation",
      difficulty: "beginner",
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const wordbookId = wordbookResult.id;
    console.log(`📚 创建词书成功: ${wordbookId}`);
    
    // 2. 为每个单词创建卡片
    let successCount = 0;
    const userId = "demo_user"; // 演示用户ID
    
    for (const wordData of sampleWords) {
      try {
        // 初始化FSRS状态
        const fsrsState = {
          difficulty: 5, // 默认难度
          stability: 2.5, // 默认稳定性
          retrievability: 0,
          status: 'new',
          due: new Date(),
          lapses: 0,
          reps: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          seed: Math.floor(Math.random() * 10000)
        };
        
        // 创建卡片
        await db.collection('cards').add({
          userId: userId,
          wordbookId: wordbookId,
          word: wordData.word,
          pronunciation: wordData.pronunciation,
          meanings: wordData.meanings,
          fsrs: fsrsState,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        successCount++;
        console.log(`  ✓ 导入单词: ${wordData.word}`);
        
      } catch (error) {
        console.error(`  ✗ 导入单词失败: ${wordData.word}`, error.message);
      }
    }
    
    console.log(`🎉 导入完成！成功导入 ${successCount}/${sampleWords.length} 个单词`);
    
    // 3. 创建默认用户FSRS参数
    try {
      await db.collection('user_fsrs_params').add({
        userId: userId,
        wordbookId: wordbookId,
        w: [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542],
        requestRetention: 0.9,
        maximumInterval: 36500,
        optimized: false,
        metrics: {
          logLoss: 0,
          rmse: 0,
          accuracy: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('⚙️ 创建默认FSRS参数成功');
    } catch (error) {
      console.log('⚠️ 创建默认FSRS参数失败:', error.message);
    }
    
    console.log('✅ 所有数据导入完成！');
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
    throw error;
  }
}

// 导出函数
module.exports = { importSampleWords };

// 如果直接运行此脚本
if (require.main === module) {
  importSampleWords()
    .then(() => {
      console.log('🎉 示例数据导入完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 导入失败:', error);
      process.exit(1);
    });
}