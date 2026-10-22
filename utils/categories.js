const CATEGORIES = [
  {
    id: 'travel',
    name: '长途交通费',
    icon: '🚄',
    color: '#2563eb',
    keywords: ['长途交通费', '长途交通', '10201', '12306', '火车', '高铁', '动车', '机票', '飞机', '航空', '携程', '飞猪', '车票', '客运', 'train', 'flight', 'air', '南航', '东航', '国航', '海航', '春秋', '厦航', '深航', '川航', '去哪儿', '同程', '艺龙', '途牛', 'ctrip']
  },
  {
    id: 'taxi',
    name: '市内交通费',
    icon: '🚕',
    color: '#0f766e',
    keywords: ['市内交通费', '市内交通', '打车', '滴滴', '高德', '美团打车', '曹操', '首汽', '出租车', '网约车', '地铁', '公交', 'didi', 'gaode', 'taxi', '如祺', 'T3', '花小猪', '享道']
  },
  {
    id: 'lodging',
    name: '差旅住宿费',
    icon: '🏨',
    color: '#7c3aed',
    keywords: ['差旅住宿费', '住宿费', '差旅住宿', '住宿', '10203', '酒店', '宾馆', '民宿', '如家', '汉庭', '亚朵', '全季', '万豪', '希尔顿', '洲际', '香格里拉', '锦江', '华住', '速8', 'hotel', 'inn']
  },
  {
    id: 'meal',
    name: '餐补',
    icon: '🍜',
    color: '#0284c7',
    keywords: ['餐补', '餐费', '餐饮', '工作餐', '误餐', '饭店', '餐厅', '外卖', '美团', '饿了么', '咖啡', '星巴克', '瑞幸', '肯德基', '麦当劳', 'restaurant', 'food', '食品', '甜品', '奶茶', '饮品']
  },
  {
    id: 'entertainment',
    name: '招待费',
    icon: '🤝',
    color: '#0ea5e9',
    keywords: ['招待费', '业务招待', '招待', '接待', '宴请', '客户餐', '客户招待', '会务接待']
  },
  {
    id: 'office',
    name: '办公费',
    icon: '📄',
    color: '#0891b2',
    keywords: ['办公费', '办公用品', '文具', '打印', '印刷', '墨盒', '硒鼓', 'A4纸', '纸张', '文件夹', '笔记本', '笔', '订书机', '计算器', 'office']
  },
  {
    id: 'welfare',
    name: '福利费',
    icon: '🎁',
    color: '#db2777',
    keywords: ['福利费', '福利', '礼品', '节日', '员工关怀', '团队聚餐', '生日', '慰问', '工会']
  },
  {
    id: 'communication',
    name: '通讯费',
    icon: '📱',
    color: '#6366f1',
    keywords: ['通讯费', '电话费', '快递', '顺丰', '圆通', '中通', 'EMS', '邮政', '话费', '网络费', '网费', '宽带', '邮递', '韵达', '申通', '百世', '极兔']
  },
  {
    id: 'training',
    name: '培训费',
    icon: '📚',
    color: '#ca8a04',
    keywords: ['培训费', '培训', '课程', '考试', '教材', '学习', '教育', '进修', '认证']
  },
  {
    id: 'meeting',
    name: '会议费',
    icon: '📋',
    color: '#9333ea',
    keywords: ['会议费', '会务费', '会议', '研讨会', '座谈会', '论坛', '峰会']
  },
  {
    id: 'rental',
    name: '租赁费',
    icon: '🏢',
    color: '#dc2626',
    keywords: ['租赁费', '租赁', '房租', '场地', '设备租赁', '车位', 'rental']
  },
  {
    id: 'maintenance',
    name: '维修费',
    icon: '🔧',
    color: '#d97706',
    keywords: ['维修费', '维修', '修理', '保养', '维护', '检测', '检修']
  },
  {
    id: 'consulting',
    name: '咨询费',
    icon: '💼',
    color: '#4f46e5',
    keywords: ['咨询费', '咨询', '审计', '法律', '顾问', '评估', '鉴证', '律师', '会计']
  },
  {
    id: 'insurance',
    name: '保险费',
    icon: '🛡',
    color: '#059669',
    keywords: ['保险费', '保险', '财产险', '人身险', '社保', '公积金', 'insurance']
  },
  {
    id: 'advertising',
    name: '广告宣传费',
    icon: '📢',
    color: '#e11d48',
    keywords: ['广告费', '宣传费', '广告宣传', '推广', '展会', '展览', '印刷品', '广告', '营销', '策划']
  },
  {
    id: 'utilities',
    name: '水电物业费',
    icon: '💡',
    color: '#2563eb',
    keywords: ['水电费', '水费', '电费', '物业费', '物业', '燃气', '取暖', 'utility']
  },
  {
    id: 'other',
    name: '其他',
    icon: '📦',
    color: '#64748b',
    keywords: []
  }
]

function getCategoryById(id) {
  return CATEGORIES.find((item) => item.id === id) || CATEGORIES[CATEGORIES.length - 1]
}

// ============================================================
// 智能分类：遍历所有类别的关键词，按匹配数量和优先级打分
// ============================================================
function classifyByText(text) {
  const source = (text || '').toLowerCase()
  let bestCategory = null
  let bestScore = 0

  CATEGORIES.forEach((category) => {
    if (category.id === 'other') return

    let score = 0
    category.keywords.forEach((keyword) => {
      if (source.indexOf(keyword.toLowerCase()) >= 0) {
        // 长关键词匹配权重更高（更精确）
        score += keyword.length >= 4 ? 3 : 1
      }
    })

    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  })

  return bestCategory || getCategoryById('other')
}

module.exports = {
  CATEGORIES,
  getCategoryById,
  classifyByText
}
