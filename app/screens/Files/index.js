import React, {Component, createRef} from 'react';
import axios from 'axios';
import ReactPlayer from 'react-player';
import { disableBodyScroll, enableBodyScroll, clearAllBodyScrollLocks } from 'body-scroll-lock';
import './styles.scss';

const renderFileList = (files, selectedID, searchTerm, handleClick, targetRef) => {
  if (files.length) {
    return (
      <ul ref={targetRef} className={'filelist'}>
        {
          files.filter(file =>
            decodeURI(file.name.toString())
              .toLowerCase()
              .indexOf(searchTerm.toLowerCase())
            !== -1
          ).map((file, index) => (
            <li
              key={index}
              className={`list-item ${selectedID == index ? 'active' : ''}`}
            >
              <a data-index={index} data-isdirectory={file.isDirectory} href={file.isDirectory ? file.path : file.file} onClick={handleClick}>
                {file.name}
                {
                  file.isDirectory ?
                    <span className={'directoryIcon'}>&#8627;</span> :
                    null
                }
              </a>
            </li>
          ))
        }
      </ul>
    )
  }
  else {
    return (
      <div className={'message-wrapper'}>
        <p>no files</p>
      </div>
    );
  }
};

class Files extends Component {
  constructor(props) {
    super(props);

    this.state = {
      directory: '',
      homePath: '',
      files: [],
      hasFileListLoaded: false,
      isFileListLoading: false,
      isTouchingPlayer: false,
      searchTerm: '',
      selectedFileID: null,
      selectedFileURL: '#'
    };

    this.pollInterval;
    this.targetElement = createRef();
  }

  componentDidMount() {
    this.getDirectory();
    this.updateHomePath();

    this.pollInterval = setInterval(() => this.getDirectory(), 5000);
  }

  componentWillUnmount() {
    clearAllBodyScrollLocks();
    clearInterval(this.pollInterval);
  }

  async getDirectory() {
    this.setState({isFileListLoading: true});

    let query = '';
    if (this.state.directory) {
      query = `?path=${encodeURI(this.state.directory)}`;
    }

    const response = await axios.get(`/directory${query}`);

    if (response.data.status === 'ok') {
      this.setState({
        hasFileListLoaded: true,
        isFileListLoading: false,
        files: response.data.files,
        directory: response.data.newPath
      });

      if (response.data.files && !this.state.isTouchingPlayer) {
        disableBodyScroll(this.targetElement.current);
      }
    }
    else {
      this.setState({
        hasFileListLoaded: true,
        isFileListLoading: false,
        files: [],
      });
    }
  }

  async upDirectory() {
    this.setState({isFileListLoading: true});

    let query = '';
    if (this.state.directory) {
      query = `?path=${encodeURI(this.state.directory)}&up=true`;
    }

    const response = await axios.get(`/directory${query}`);

    this.setState({
      isFileListLoading: false,
      files: response.data.files,
      directory: response.data.newPath,
      selectedFileID: null,
    });
  }

  handleSearch(e) {
    this.setState({searchTerm: e.target.value});
  }

  handlePlayerTouch(isTouchingPlayer) {
    if (isTouchingPlayer) {
      this.setState({isTouchingPlayer});
      enableBodyScroll(this.targetElement.current)
    }
    else {
      this.setState({isTouchingPlayer});
      disableBodyScroll(this.targetElement.current);
    }
  }

  playFile(selectedFileID, selectedFileURL) {
    this.setState({selectedFileID, selectedFileURL});
  }

  async updateHomePath() {
    const response = await axios.get('/homepath');
    this.setState({homePath: response.data});
  }

  clearSearch() {
    this.setState({searchTerm: ''});
  }

  handleItemSelect(e) {
    e.preventDefault();
    if (e.target.getAttribute('data-isdirectory') === 'true') {
      this.setState({
        directory: e.target.getAttribute('href')
      }, () => {
        this.clearSearch();
        this.getDirectory();
      });
    }
    else {
      this.playFile(e.target.getAttribute('data-index'), e.target.href)
    }
  }

  render() {
    return (
      <div className={'files-container'}>
        <div className={'list'}>
          <div className={'list-header'}>
            <h2>files&nbsp;<small>({this.state.files.length})</small></h2>
            <div className={'search-wrapper'}>
              <input type={'text'} placeholder={'search...'} value={this.state.searchTerm} onChange={(e) => this.handleSearch(e)} />
              {
                this.state.searchTerm ?
                  <button className={'clear-search'} onClick={() => this.clearSearch()}>
                    x
                  </button> :
                  null
              }
            </div>
          </div>

          <div className={'list-body'}>
            {
              (this.state.isFileListLoading && !this.state.hasFileListLoaded) ?
                <div className={'message-wrapper'}><p>loading...</p></div> :
                renderFileList(this.state.files, this.state.selectedFileID, this.state.searchTerm, this.handleItemSelect.bind(this), this.targetElement)
            }
            {
              this.state.homePath !== this.state.directory ?
                <button className={'up-dir-button'} onClick={() => this.upDirectory()}>&#8624;</button> :
                null
            }
          </div>
        </div>

        <div className={'fileviewer-wrapper'}>
          <ReactPlayer
            onTouchEnd={() => this.handlePlayerTouch(false)}
            onTouchStart={() => this.handlePlayerTouch(true)}
            playing={true} playsinline url={this.state.selectedFileURL} controls height={'100%'} width={'100%'} />
        </div>
      </div>
    );
  }
}

export default Files;
