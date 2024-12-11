import { registerAs } from '@nestjs/config';
export default registerAs('filesystem', () => (
  process.env.NODE_ENV === 'staging' ? {
    default: 'user',
    disks: {
      services: {
        driver: 's3',
        bucket: process.env.BUCKET_NAME,
        key: process.env.BUCKET_KEY,
        secret: process.env.BUCKET_SECRET,
        region: process.env.BUCKET_REGION
      },
      user: {
        driver: 's3',
        bucket: process.env.BUCKET_NAME,
        key: process.env.BUCKET_KEY,
        secret: process.env.BUCKET_SECRET,
        region: process.env.BUCKET_REGION
      },
      invoice: {
        driver: 's3',
        bucket: process.env.BUCKET_NAME,
        key: process.env.BUCKET_KEY,
        secret: process.env.BUCKET_SECRET,
        region: process.env.BUCKET_REGION
      },
      milestone: {
        driver: 's3',
        bucket: process.env.BUCKET_NAME,
        key: process.env.BUCKET_KEY,
        secret: process.env.BUCKET_SECRET,
        region: process.env.BUCKET_REGION
      },
      subcategory: {
        driver: 's3',
        bucket: process.env.BUCKET_NAME,
        key: process.env.BUCKET_KEY,
        secret: process.env.BUCKET_SECRET,
        region: process.env.BUCKET_REGION
      },
      support: {
        driver: 's3',
        bucket: process.env.BUCKET_NAME,
        key: process.env.BUCKET_KEY,
        secret: process.env.BUCKET_SECRET,
        region: process.env.BUCKET_REGION
      },
      extra: {
        driver: 's3',
        bucket: process.env.BUCKET_NAME,
        key: process.env.BUCKET_KEY,
        secret: process.env.BUCKET_SECRET,
        region: process.env.BUCKET_REGION
      }
    }
  } : {
    default: 'user',
    disks: {
      services: {
        driver: process.env.DRIVER,
        basePath: process.env.BASEPATH,
        baseUrl: process.env.BASEURL
        // bucket: process.env.AWS_S3_DOCS_BUCKET,
        // key: process.env.AWS_KEY,
        // secret: process.env.AWS_SECRET,
        // region: process.env.AWS_REGION,
      },
      user: {
        driver: process.env.DRIVER,
        basePath: process.env.BASEPATH,
        baseUrl: process.env.BASEURL
        // bucket: process.env.AWS_S3_DOCS_BUCKET,
        // key: process.env.AWS_KEY,
        // secret: process.env.AWS_SECRET,
        // region: process.env.AWS_REGION,
      },
      invoice: {
        driver: process.env.DRIVER,
        basePath: process.env.BASEPATH,
        baseUrl: process.env.BASEURL
        // bucket: process.env.AWS_S3_DOCS_BUCKET,
        // key: process.env.AWS_KEY,
        // secret: process.env.AWS_SECRET,
        // region: process.env.AWS_REGION,
      },
      milestone: {
        driver: process.env.DRIVER,
        basePath: process.env.BASEPATH,
        baseUrl: process.env.BASEURL
        // bucket: process.env.AWS_S3_DOCS_BUCKET,
        // key: process.env.AWS_KEY,
        // secret: process.env.AWS_SECRET,
        // region: process.env.AWS_REGION,
      },
      subcategory: {
        driver: process.env.DRIVER,
        basePath: process.env.BASEPATH,
        baseUrl: process.env.BASEURL
      },
      support: {
        driver: process.env.DRIVER,
        basePath: process.env.BASEPATH,
        baseUrl: process.env.BASEURL
        // bucket: process.env.AWS_S3_DOCS_BUCKET,
        // key: process.env.AWS_KEY,
        // secret: process.env.AWS_SECRET,
        // region: process.env.AWS_REGION,
      },
      extra: {
        driver: process.env.DRIVER,
        basePath: process.env.BASEPATH,
        baseUrl: process.env.BASEURL
      }
    }
  })
);
