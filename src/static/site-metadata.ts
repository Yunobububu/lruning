interface ISiteMetadataResult {
  siteTitle: string;
  siteUrl: string;
  description: string;
  logo: string;
  navLinks: {
    name: string;
    url: string;
  }[];
}

const getBasePath = () => {
  const baseUrl = import.meta.env.BASE_URL;
  return baseUrl === '/' ? '' : baseUrl;
};

const data: ISiteMetadataResult = {
  siteTitle: 'L.RUN',
  siteUrl: `${getBasePath()}/`,
  logo: '',
  description: 'Running dashboard — track every km',
  navLinks: [
    {
      name: '首页',
      url: '/',
    },
    {
      name: '轨迹墙',
      url: '/tracks',
    },
    {
      name: '热力图',
      url: '/heatmap',
    },
    {
      name: '奔跑人生',
      url: '/runlife',
    },
    {
      name: '赛事记录',
      url: '/races',
    },
  ],
};

export default data;
