import type { ResumeConfig } from '@/components/types';

/** 初始化常量 */
export const RESUME_INFO: ResumeConfig = {
  avatar: {
    hidden: true,
  },
  profile: {
    name: 'XXX',
    mobile: '13812345678',
    email: 'abc@163.com',
    workPlace: '深圳',
    positionTitle: '交易员助理 / 量化研究方向',
  },
  titleNameMap: {
    aboutme: '自我评价',
    skillList: '技能与证书',
    educationList: '教育背景',
    workExpList: '实习经历',
    projectList: '社会实践',
    awardList: '荣誉奖励',
  },
  aboutme: {
    aboutme_desc:
      '• 法律与金融复合背景，擅长逻辑思维、学习能力强，硕士期间 GPA 3.55（前 15%）\n' +
      '• 拥有量化组合、期权定价建模、机器学习、债券评级分析等项目经验，多次担任组长，具备优秀的团队协作能力\n' +
      '• 拥有研究员、交易员实习经历，熟悉买方/卖方视角的行业研究、量化开发与股票交易实践\n' +
      '• 性格踏实沉稳、善于沟通，具备组织协调与问题解决能力，善于运用计算机工具提升效率',
  },
  skillList: [
    {
      skill_name: '专业资格',
      skill_desc: 'CFA 一级；基金从业资格；证券从业资格',
    },
    {
      skill_name: '语言能力',
      skill_desc:
        'IELTS 6.5（听力 7，阅读 7）；硕士阶段全英文教学，英语听说读写熟练，可作为工作语言',
    },
    {
      skill_name: '计算机技能',
      skill_desc:
        '熟练掌握 Python、R、VBA、Office 与 SQL 数据库操作，了解 C++ 与 Linux 系统',
    },
  ],
  educationList: [
    {
      edu_time: ['2017.08', '至今'],
      school: '香港中文大学（深圳）',
      major:
        '金融学专业｜主修课程：固定收益分析、公司金融、财务报表分析、衍生品市场、中国经济和金融市场、Excel/VBA',
      academic_degree: '硕士（全日制）',
    },
    {
      edu_time: ['2012.09', '2015.06'],
      school: 'XX 大学（985）',
      major: '经济学专业',
      academic_degree: '本科（双学位）',
    },
    {
      edu_time: ['2011.09', '2015.06'],
      school: 'XX 大学（985）',
      major: '法学专业',
      academic_degree: '本科（全日制）',
    },
  ],
  workExpList: [],
  projectList: [],
  awardList: [
    {
      award_info: '综合二等奖学金',
    },
    {
      award_info: 'XX 奖学金',
    },
    {
      award_info: 'XX 竞赛二等奖',
    },
    {
      award_info: '院级优秀学生',
    },
  ],
};
