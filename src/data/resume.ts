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
  workExpList: [
    {
      company_name: 'XX 基金',
      department_name: '交易部',
      work_time: ['2018.03', '至今'],
      work_desc:
        '• 使用股票交易系统替补交易员完成股票交易，累计交易量约 10 亿元，并参与新股申购\n' +
        '• 总结晨会要点并结合每日交易场景开发个股与大盘相关性分析工具，辅助交易员决策\n' +
        '• 使用债券交易系统，协助完成询价、交易申请与交易匹配等工作',
    },
    {
      company_name: 'XX 证券',
      department_name: '量化投资研究部',
      work_time: ['2018.01', '2018.03'],
      work_desc:
        '• 对接底层数据接口，协助搭建量化交易平台，整合米筐、聚宽、万得、国信等多源千万级股票指标\n' +
        '• 完成数据程序化比对与 API 接口开发，并开展交易策略回测与平台架构优化\n' +
        '• 研究历史股价连续下跌与未来涨跌幅，参与对冲五因子模型因子风险策略',
    },
    {
      company_name: 'XX 证券',
      department_name: '军工组',
      work_time: ['2016.11', '2017.01'],
      work_desc:
        '• 跟踪调研航天时代电子科技有限公司，撰写并完成公司深度研究报告\n' +
        '• 收集军用无人机行业资料，整理军事信息化及相关标的供行业研究员使用',
    },
  ],
  projectList: [
    {
      project_name: '机器学习情绪分析',
      project_role: '组长',
      project_time: '2017.10 - 2017.12',
      project_desc:
        '在导师指导下，构建情绪与股价关系的分析框架，完成跨市场情绪分析',
      project_content:
        '• 使用彭博分析苹果股价与情绪关联，完成中国平安雪球评论情绪量化\n' +
        '• 利用 Python 构建机器学习模型，实现情绪数据的自动化处理与预测',
    },
    {
      project_name: '债券违约与基金分析',
      project_role: '组长',
      project_time: '2017.10 - 2018.02',
      project_desc: '开展债券违约预测与基金量化评估，提升投资策略表现',
      project_content:
        '• 收集国内债券数据，运用 PCA 与 Lasso-Logistic 回归预测评级下调与违约\n' +
        '• 获取 A 股历史数据构建 Fama-French 三因子模型，采用 Smart Beta 策略优化银河定投宝基金选股\n' +
        '• 实现量化动量策略，回测年化收益约 40%',
    },
    {
      project_name: '学生会工作',
      project_role: '主席',
      project_time: '2013.09 - 2014.07',
      project_desc: '组织大型校级活动并推动学院教务系统优化',
      project_content:
        '• 举办规模最大的电竞赛事及学院运动会，组织企业参访活动\n' +
        '• 协调资源推动教务系统改进，提升学生办事效率',
    },
  ],
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
