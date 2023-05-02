import {
  Container,
  Typography,
  Link as JoyLink,
  List,
  ListItem,
  Box,
  Button
} from '@mui/joy'
import Link from 'next/link'
import {
  FaReact,
  FaCss3Alt,
  FaChartLine,
  FaIcons,
  FaCheck
} from 'react-icons/fa'
import { MdAnimation } from 'react-icons/md'
import Layout from './layout'
import Head from 'next/head'

const AboutPage = () => {
  return (
    <Layout>
      <Head>
        <title>About</title>
      </Head>
      <Container>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Typography level='h1'>About 😎</Typography>
          <Button href='/' component={Link} variant='plain'>
            Home
          </Button>
        </Box>
        <Typography>
          This is the project of HVAC course for the 4<sup>th</sup> year in the
          electrical department of faculty of engineering, Alexandria
          university.
        </Typography>
        <Typography>
          This course is instructed by <strong>Prof. Mohamed M. Zakaria</strong>
          .
        </Typography>
        <Typography level='h3' sx={{ mt: 2 }}>
          Tech Stack 🧑‍💻🔥
        </Typography>
        <Typography>
          This project is done with the following technologies & libraries:
        </Typography>
        <List>
          <ListItem>
            <FaReact />
            &nbsp;
            <strong>React</strong>&nbsp;for reactive web pages.
          </ListItem>
          <ListItem>
            <FaCheck />
            &nbsp;
            <strong>Zod</strong>&nbsp;for data validation.
          </ListItem>
          <ListItem>
            <FaIcons />
            &nbsp;
            <strong>React icons</strong>&nbsp;for the awesome icons.
          </ListItem>
          <ListItem>
            <FaCss3Alt />
            &nbsp;
            <strong>Bulma CSS</strong>&nbsp;for basic styling.
          </ListItem>
          <ListItem>
            <FaChartLine />
            &nbsp;
            <strong>Recharts</strong>&nbsp;for charts.
          </ListItem>
          <ListItem>
            <MdAnimation />
            &nbsp;
            <strong>Framer motion</strong>&nbsp;for basic animations.
          </ListItem>
        </List>
        <Typography level='h3' sx={{ mt: 2 }}>
          The Team 🤝🫂
        </Typography>
        <Typography>
          This project is done by a group of very intelligent students. Thanks
          to them, this project is finished.
        </Typography>
        <List>
          <ListItem>عبدالله كمال</ListItem>
          <ListItem>بهجت </ListItem>
          <ListItem>محمد رمضان</ListItem>
          <ListItem>محمد فياض</ListItem>
          <ListItem>حسام</ListItem>
          <ListItem>أحمد حسن</ListItem>
          <ListItem>عثمان علي</ListItem>
          <ListItem>عبدالله أحمد</ListItem>
        </List>
        <Typography>
          Lastly, this project is open source, you can find it{' '}
          <JoyLink
            href='https://github.com/abdullahahmeda/lattice-builder-next'
            component={Link}
            rel='_'
          >
            here
          </JoyLink>
          .
        </Typography>
      </Container>
    </Layout>
  )
}

export default AboutPage
